import { type Metadata } from "next";
import { WeddingHero } from "~/app/_components/WeddingHero";

export const metadata: Metadata = {
  title: "Bodas",
  description: "Fotografía de bodas — encontrá y descargá las fotos de tu casamiento en alta resolución.",
};

export default function BodasPage() {
  return (
    <main className="min-h-screen bg-[#140c05]">
      <WeddingHero />
    </main>
  );
}
