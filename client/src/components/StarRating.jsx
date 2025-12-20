import React, { useState } from 'react';
import { Star } from 'lucide-react';
import './StarRating.css';

const StarRating = ({
    rating = 0,
    maxStars = 5,
    size = 20,
    editable = false,
    onChange,
    showValue = true,
    totalReviews
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (value) => {
        if (editable && onChange) {
            onChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (editable) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    const displayRating = hoverRating || rating;

    return (
        <div className="star-rating">
            <div className="stars-container">
                {[...Array(maxStars)].map((_, index) => {
                    const starValue = index + 1;
                    const isFilled = starValue <= Math.floor(displayRating);
                    const isHalf = !isFilled && starValue <= displayRating + 0.5;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={`star-btn ${editable ? 'editable' : ''}`}
                            onClick={() => handleClick(starValue)}
                            onMouseEnter={() => handleMouseEnter(starValue)}
                            onMouseLeave={handleMouseLeave}
                            disabled={!editable}
                        >
                            <Star
                                size={size}
                                className={`star ${isFilled ? 'filled' : ''} ${isHalf ? 'half' : ''}`}
                                fill={isFilled ? '#fbbf24' : 'none'}
                                stroke={isFilled || isHalf ? '#fbbf24' : '#d1d5db'}
                            />
                        </button>
                    );
                })}
            </div>
            {showValue && (
                <span className="rating-value">
                    {rating.toFixed(1)}
                    {totalReviews !== undefined && (
                        <span className="review-count">({totalReviews})</span>
                    )}
                </span>
            )}
        </div>
    );
};

// Review Summary Component
export const ReviewSummary = ({ ratings = {} }) => {
    const total = Object.values(ratings).reduce((a, b) => a + b, 0);
    const average = total > 0
        ? Object.entries(ratings).reduce((sum, [stars, count]) => sum + (parseInt(stars) * count), 0) / total
        : 0;

    return (
        <div className="review-summary">
            <div className="review-average">
                <span className="big-rating">{average.toFixed(1)}</span>
                <StarRating rating={average} size={24} showValue={false} />
                <span className="total-reviews">{total} reviews</span>
            </div>
            <div className="rating-bars">
                {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratings[stars] || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                        <div key={stars} className="rating-bar-row">
                            <span className="bar-label">{stars}</span>
                            <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                            <div className="bar-track">
                                <div className="bar-fill" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="bar-count">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StarRating;
