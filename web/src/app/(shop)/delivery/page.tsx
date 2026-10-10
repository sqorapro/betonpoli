import { ContentPage, pageMetadata } from "@/components/ContentPage";

export const generateMetadata = () => pageMetadata("delivery");

export default function Page() {
  return <ContentPage slug="delivery" />;
}
