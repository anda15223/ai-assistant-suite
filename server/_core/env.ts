export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsBucketName: process.env.AWS_BUCKET_NAME ?? "",
  awsRegion: process.env.AWS_REGION ?? "eu-central-1",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
};
