import { ContentPage, pageMetadata } from "@/components/ContentPage";

export const generateMetadata = () => pageMetadata("privacy");

export default function Page() {
  return <ContentPage slug="privacy" />;
}
