import * as mime from 'mime-types';
import * as path from 'path';
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { walkDirectory } from "./utils";

interface StaticWebsiteArgs {
  idPrefix: string;
  sourcePath: string;
  dnsName: string;
  indexDocument: string;
  logsBucket: aws.s3.GetBucketResult;
}

async function staticWebsite({
  idPrefix,
  sourcePath,
  dnsName,
  indexDocument,
  logsBucket,
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
    website: { indexDocument }
  });

  for await (const file of walkDirectory(sourcePath)) {
    const relPath = path.relative(sourcePath, file);
    const contentType = mime.lookup(file) || 'application/octet-stream';
    new aws.s3.BucketObject(`${idPrefix}${relPath}`, {
      bucket: siteBucket,
      key: relPath,
      source: new pulumi.asset.FileAsset(file),
      acl: 'public-read',
      contentType,
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
    websiteEndpoint: siteBucket.websiteEndpoint,
    cloudfrontDomain: distribution.domainName,
    endpoint: `https://${dnsName}`,
  };
}

export = async () => {
  const config = new pulumi.Config();

  const dnsName = config.require('dns-name');
  const docsDnsName = config.require('docs-dns-name');
  const logsBucketName = config.require('logs-bucket');

  const logsBucket = await aws.s3.getBucket({
    bucket: logsBucketName
  });

  const mainSite = await staticWebsite({
    idPrefix: '',
    sourcePath: path.normalize(path.resolve(__dirname, '../dist/demo')),
    dnsName,
    indexDocument: 'demo-history.html',
    logsBucket,
  });

  const docsSite = await staticWebsite({
    idPrefix: 'docs-',
    sourcePath: path.normalize(path.resolve(__dirname, '../dist/docs/html')),
    dnsName: docsDnsName,
    indexDocument: 'index.html',
    logsBucket,
  });

  return {
    ...mainSite,
    docsWebsiteEndpoint: docsSite.websiteEndpoint,
    docsCloudfrontDomain: docsSite.cloudfrontDomain,
    docsEndpoint: docsSite.endpoint,
  };
}
