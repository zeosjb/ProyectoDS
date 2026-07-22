import { BuilderPage } from "@/components/builder/BuilderPage";

type PublicPageProps = {
  params: Promise<{ page: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublicPage({ params, searchParams }: PublicPageProps) {
  const resolved = await params;
  return <BuilderPage urlPath={"/" + resolved.page.join("/")} searchParams={await searchParams} />;
}
