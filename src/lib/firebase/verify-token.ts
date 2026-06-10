import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Verifies a Firebase ID token without the heavy firebase-admin SDK (whose
// jwks-rsa/jose dependency chain breaks in the Vercel serverless runtime).
// Firebase ID tokens are RS256 JWTs signed by Google; we check the signature
// against Google's published keys plus the issuer/audience/expiry claims.

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Google's public keys for Firebase ID tokens (JWK format). jose caches and
// refreshes these per the response's cache headers.
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type FirebaseToken = JWTPayload & {
  phone_number?: string;
  user_id?: string;
};

export async function verifyFirebaseIdToken(token: string): Promise<FirebaseToken> {
  if (!PROJECT_ID) {
    throw new Error("Missing Firebase project id");
  }

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ["RS256"],
  });

  if (!payload.sub) {
    throw new Error("Token has no subject");
  }

  return payload as FirebaseToken;
}
