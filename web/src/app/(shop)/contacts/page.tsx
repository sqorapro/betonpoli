import { ContentPage, pageMetadata } from "@/components/ContentPage";

export const generateMetadata = () => pageMetadata("contacts");

export default function Page() {
  return <ContentPage slug="contacts" />;
}
