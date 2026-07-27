import { Stars } from './stars';

export function Reviews({ rating, reviewCount, reviews }) {
    if (!reviews?.length) {
        return null;
    }
    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-baseline gap-3">
                <h2>Reviews</h2>
                <span className="flex items-center gap-2 text-neutral-300">
                    <Stars rating={rating} />
                    <span className="text-sm">
                        {rating.toFixed(1)} · {reviewCount} reviews
                    </span>
                </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {reviews.map((review, index) => (
                    <figure key={index} className="flex flex-col gap-3 px-5 py-5 bg-white rounded-sm text-neutral-700">
                        <Stars rating={review.rating} />
                        <blockquote className="text-neutral-700">“{review.text}”</blockquote>
                        <figcaption className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                            {review.author}
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                ✓ Verified buyer
                            </span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
}
