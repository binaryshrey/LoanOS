import HeroSection from "@/components/HeroSection";
import {
  withAuth,
  getSignInUrl,
  getSignUpUrl,
} from "@workos-inc/authkit-nextjs";

export default async function Home() {
  const { user } = await withAuth();
  const signInUrl = await getSignInUrl();
  const signUpUrl = await getSignUpUrl();

  return (
    <div>
      <HeroSection user={user} signInUrl={signInUrl} signUpUrl={signUpUrl} />
    </div>
  );
}
