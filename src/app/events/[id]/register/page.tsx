import EventRegistrationForm from "@/components/EventRegistrationForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventRegisterPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <EventRegistrationForm initialSlugOrId={resolvedParams.id} />;
}
