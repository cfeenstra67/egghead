import * as mime from 'mime-types';
import * as path from 'path';
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { walkDirectory } from "./utils";

interface StaticWebsiteArgs {
  idPrefix: string;
  directories?: string[];
  files?: string[];
  dnsName: string;
  indexDocument: string;
  logsBucket: aws.s3.GetBucketResult;
  tags: Record<string, string>;
}

async function staticWebsite({
  idPrefix,
  directories,
  files,
  dnsName,
  indexDocument,
  logsBucket,
  tags,
}: StaticWebsiteArgs) {

  const rootDomain = dnsName.split('.').slice(-2).join('.');

  const zone = await aws.route53.getZone({
    name: rootDomain
  });

  const eastProvider = new aws.Provider(`${idPrefix}east`, {
    profile: aws.config.profile,
    region: 'us-east-1'
  });

  const certificate = new aws.acm.Certificate(`${idPrefix}certificate`, {
    domainName: dnsName,
    validationMethod: 'DNS',
    tags,
  }, {
    provider: eastProvider
  });

  const certificateValidationDomain = new aws.route53.Record(`${idPrefix}${dnsName}-validation`, {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: zone.zoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: 600
  });

  const certiciateValidation = new aws.acm.CertificateValidation(`${idPrefix}certificate-validation`, {
    certificateArn: certificate.arn,
    validationRecordFqdns: [certificateValidationDomain.fqdn],
  }, {
    provider: eastProvider
  });

  const certificateArn = certiciateValidation.certificateArn;

  const siteBucket = new aws.s3.Bucket(`${idPrefix}${dnsName}-site-bucket`, {
    bucket: dnsName,
    acl: 'public-read',
    website: { indexDocument },
    tags,
  });

  for (const directory of directories ?? []) {
    for await (const file of walkDirectory(directory)) {
      const relPath = path.relative(directory, file);
      const contentType = mime.lookup(file) || 'application/octet-stream';
      new aws.s3.BucketObject(`${idPrefix}${relPath}`, {
        bucket: siteBucket,
        key: relPath,
        source: new pulumi.asset.FileAsset(file),
        acl: 'public-read',
        contentType,
        tags,
      });
    }
  }
  for (const file of files ?? []) {
    const relPath = path.basename(file);
    const contentType = mime.lookup(file) || 'application/octet-stream';
    new aws.s3.BucketObject(`${idPrefix}${relPath}`, {
      bucket: siteBucket,
      key: relPath,
      source: new pulumi.asset.FileAsset(file),
      acl: 'public-read',
      contentType,
      tags,
    });
  }

  const distribution = new aws.cloudfront.Distribution(`${idPrefix}distribution`, {
    enabled: true,
    isIpv6Enabled: false,
    aliases: [dnsName],
    origins: [
      {
        originId: siteBucket.arn,
        domainName: siteBucket.websiteEndpoint,
        customOriginConfig: {
          originProtocolPolicy: 'http-only',
          httpPort: 80,
          httpsPort: 443,
          originSslProtocols: ['TLSv1.2'],
        },
      }
    ],
    comment: '',
    defaultRootObject: indexDocument,
    defaultCacheBehavior: {
      targetOriginId: siteBucket.arn,
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
      forwardedValues: { cookies: { forward: 'none' }, queryString: false },
      minTtl: 0,
      defaultTtl: 600,
      maxTtl: 600,
    },
    priceClass: 'PriceClass_100',
    restrictions: { geoRestriction: { restrictionType: 'none'} },
    viewerCertificate: {
      acmCertificateArn: certificateArn,
      sslSupportMethod: 'sni-only',
    },
    loggingConfig: {
      bucket: logsBucket.bucketDomainName,
      includeCookies: false,
      prefix: `${dnsName}/`
    },
    tags,
  });

  new aws.route53.Record(`${idPrefix}${dnsName}`, {
    name: dnsName.split('.').slice(0, -2).join('.'),
    zoneId: zone.zoneId,
    type: 'A',
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: true,
      }
    ],
  });
  return {
    bucketArn: siteBucket.arn,
    websiteEndpoint: siteBucket.websiteEndpoint,
    cloudfrontDomain: distribution.domainName,
    endpoint: `https://${dnsName}`,
  };
}

function githubAssumeRolePolicy(providerArn: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Id: 'github-assume-role-policy',
    Statement: [
      {
        Sid: 'AllowGithubActionsAssume',
        Effect: 'Allow',
        Action: ['sts:AssumeRoleWithWebIdentity'],
        Principal: {
          Federated: providerArn,
        },
        Condition: {
          'ForAllValues:StringLike': {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub':
              'repo:cfeenstra67/egghead:*',
          },
        },
      },
    ],
  });
}

function githubRolePolicy(bucketArns: string[]): string {
  const readActions = [
    'iam',
    's3',
    'acm',
    'route53',
    'cloudfront'
  ].flatMap((service) => [
    `${service}:Get*`,
    `${service}:List*`,
    `${service}:Describe*`,
  ]);

  return JSON.stringify({
    Version: '2012-10-17',
    Id: 'github-role-policy',
    Statement: [
      {
        Sid: 'AllowRead',
        Effect: 'Allow',
        Action: readActions,
        Resource: ['*'],
      },
      {
        Sid: 'DeployActions',
        Effect: 'Allow',
        Resource: bucketArns.flatMap((arn) => [arn, arn + '/*']),
        Action: ['s3:PutObject*'],
      },
    ],
  });
}

export = async () => {
  const config = new pulumi.Config();

  const dnsName = config.require('dns-name');
  const docsDnsName = config.require('docs-dns-name');
  const logsBucketName = config.require('logs-bucket');
  const tags = { Source: 'pulumi', Project: 'egghead' };

  const logsBucket = await aws.s3.getBucket({
    bucket: logsBucketName
  });

  const mainSite = await staticWebsite({
    idPrefix: '',
    directories: [path.normalize(path.resolve(__dirname, '../dist/demo'))],
    files: [
      path.normalize(path.resolve(__dirname, '../dist/chrome.zip')),
      path.normalize(path.resolve(__dirname, '../dist/firefox.zip')),
      path.normalize(path.resolve(__dirname, '../dist/firefox-mv2.zip')),
    ],
    dnsName,
    indexDocument: 'demo-history.html',
    logsBucket,
    tags,
  });

  const docsSite = await staticWebsite({
    idPrefix: 'docs-',
    directories: [path.normalize(path.resolve(__dirname, '../dist/docs/html'))],
    dnsName: docsDnsName,
    indexDocument: 'index.html',
    logsBucket,
    tags,
  });

  // This allows us to authenticate to AWS using `githubRole` from github actions
  // workflows without having to store secrets in environment variables.
  const githubOpenIdProvider = new aws.iam.OpenIdConnectProvider(
    'github-openid-provider',
    {
      url: 'https://token.actions.githubusercontent.com',
      clientIdLists: ['sts.amazonaws.com'],
      thumbprintLists: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
      tags,
    }
  );

  // Role assumed by github actions workflows
  const githubRole = new aws.iam.Role('egghead-github-role', {
    assumeRolePolicy: githubOpenIdProvider.arn.apply(githubAssumeRolePolicy),
    inlinePolicies: [
      {
        name: 'github-role-policy',
        policy: pulumi
          .all([mainSite.bucketArn, docsSite.bucketArn])
          .apply(githubRolePolicy)
      },
    ],
    tags,
  });

  return {
    websiteEndpoint: mainSite.websiteEndpoint,
    cloudfrontDomain: mainSite.cloudfrontDomain,
    endpoint: mainSite.endpoint,
    docsWebsiteEndpoint: docsSite.websiteEndpoint,
    docsCloudfrontDomain: docsSite.cloudfrontDomain,
    docsEndpoint: docsSite.endpoint,
    githubRoleArn: githubRole.arn,
  };
}
