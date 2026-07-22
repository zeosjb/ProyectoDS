import { BuilderPage } from "@/components/builder/BuilderPage";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  return <BuilderPage urlPath="/" searchParams={await searchParams} />;
}
