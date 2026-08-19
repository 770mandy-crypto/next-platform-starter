import { Hero } from 'components/hero';
import { Marquee } from 'components/marquee';
import { Programs } from 'components/programs';
import { HowItWorks } from 'components/how-it-works';
import { Results } from 'components/results';
import { Testimonials } from 'components/testimonials';
import { Pricing } from 'components/pricing';
import { Faq } from 'components/faq';
import { CtaBanner } from 'components/cta-banner';

export default function Page() {
    return (
        <div className="flex flex-col">
            <Hero />
            <Marquee />
            <Programs />
            <HowItWorks />
            <Results />
            <Testimonials />
            <Pricing />
            <Faq />
            <CtaBanner />
        </div>
    );
}
