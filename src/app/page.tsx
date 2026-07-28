import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Deconstruction from "@/components/Deconstruction";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="flex flex-col w-full">
        <Hero />
        <Deconstruction />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
