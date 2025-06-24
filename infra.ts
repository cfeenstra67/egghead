import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as saws from "@stackattack/aws";

export default () => {
  const ctx = saws.context();
  const config = new pulumi.Config();

  const dnsName = config.require("dns-name");
  const docsDnsName = config.require("docs-dns-name");

  const demoBucket = saws.bucket(ctx.prefix("demo"), {
    paths: [
      "dist/demo",
      "dist/chrome.zip",
      "dist/firefox.zip",
      "dist/firefox-mv2.zip",
    ],
  });

  saws.staticSite(ctx.prefix("demo"), {
    bucket: demoBucket,
    domain: dnsName,
    adapter: {
      index: "demo-history.html",
      defaultHeaders: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  });

  const docsBucket = saws.bucket(ctx.prefix("docs"), {
    paths: ["dist/docs/html"],
  });

  saws.staticSite(ctx.prefix("docs"), {
    bucket: docsBucket,
    domain: docsDnsName,
    adapter: {
      index: "index.html",
    },
  });

  const githubRole = saws.githubRole(ctx, {
    repo: "cfeenstra67/egghead",
    policy: aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          actions: ["iam", "s3", "acm", "route53", "cloudfront"].flatMap(
            (service) => [
              `${service}:Get*`,
              `${service}:List*`,
              `${service}:Describe*`,
            ],
          ),
          resources: ["*"],
        },
        {
          actions: ["s3:PutObject*", "s3:DeleteObject"],
          resources: [demoBucket.arn, docsBucket.arn].flatMap((arn) => [
            arn,
            pulumi.interpolate`${arn}/*`,
          ]),
        },
      ],
    }).json,
  });

  return {
    demoUrl: `https://${dnsName}`,
    docsUrl: `https://${docsDnsName}`,
    githubRoleArn: githubRole.arn,
  };
};
