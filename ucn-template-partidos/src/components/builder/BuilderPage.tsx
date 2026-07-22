import { Content, fetchOneEntry, isPreviewing } from "@builder.io/sdk-react-nextjs";
import { getBuilderApiKey, getEnvStatus, appMeta } from "@/lib/env";
import { customComponents } from "@/components/builder/registry";
import { DomainLanding } from "@/components/domain";
import { ConfigMissing } from "@/components/ui";
import { getIsAuthenticated } from "@/lib/auth/session";

type BuilderPageProps = {
  urlPath: string;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function BuilderPage({ urlPath, searchParams = {} }: BuilderPageProps) {
  const env = getEnvStatus();
  const apiKey = getBuilderApiKey();

  if (!env.supabaseReady) {
    return <ConfigMissing missing={env.missing.filter((key) => key !== "NEXT_PUBLIC_BUILDER_API_KEY")} />;
  }

  const isAuthenticated = await getIsAuthenticated();

  if (!isAuthenticated && urlPath === "/") {
    return <DomainLanding title={appMeta.name} description={appMeta.description} isAuthenticated={false} />;
  }

  if (!apiKey) {
    return <DomainLanding title={appMeta.name} description={appMeta.description} isAuthenticated={isAuthenticated} />;
  }

  const content = await fetchOneEntry({
    model: "page",
    apiKey,
    userAttributes: { urlPath }
  });

  const previewParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") previewParams.set(key, value);
  });

  if (!content && !isPreviewing(previewParams)) {
    return <DomainLanding title={appMeta.name} description={appMeta.description} isAuthenticated={isAuthenticated} />;
  }

  return <Content content={content} apiKey={apiKey} model="page" customComponents={customComponents} />;
}
