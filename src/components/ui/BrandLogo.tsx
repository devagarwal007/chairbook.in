import Image from "next/image";
import type { CSSProperties } from "react";

type BrandLogoVariant = "horizontal" | "mark" | "stacked" | "wordmark";
type BrandLogoSize = "sm" | "md" | "lg" | "xl";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const markSizes: Record<BrandLogoSize, number> = {
  sm: 26,
  md: 28,
  lg: 40,
  xl: 56,
};

const textSizes: Record<BrandLogoSize, number> = {
  sm: 17,
  md: 16,
  lg: 18,
  xl: 26,
};

const gaps: Record<BrandLogoSize, number> = {
  sm: 10,
  md: 10,
  lg: 12,
  xl: 14,
};

const stackedSizes: Record<BrandLogoSize, { width: number; height: number }> = {
  sm: { width: 90, height: 60 },
  md: { width: 120, height: 80 },
  lg: { width: 150, height: 100 },
  xl: { width: 180, height: 120 },
};

const wordmarkSizes: Record<BrandLogoSize, { width: number; height: number }> = {
  sm: { width: 120, height: 24 },
  md: { width: 132, height: 26 },
  lg: { width: 150, height: 30 },
  xl: { width: 190, height: 38 },
};

export function BrandLogo({
  variant = "horizontal",
  size = "md",
  className,
  markClassName,
  textClassName,
  style,
  ariaLabel = "ChairBook",
}: BrandLogoProps) {
  if (variant === "stacked") {
    const { width, height } = stackedSizes[size];

    return (
      <Image
        src="/brand/chairbook-stacked.svg"
        alt={ariaLabel}
        width={width}
        height={height}
        className={className}
        unoptimized
        style={{ display: "block", width, height, ...style }}
      />
    );
  }

  if (variant === "wordmark") {
    const { width, height } = wordmarkSizes[size];

    return (
      <Image
        src="/brand/chairbook-wordmark.svg"
        alt={ariaLabel}
        width={width}
        height={height}
        className={className}
        unoptimized
        style={{ display: "block", width, height, ...style }}
      />
    );
  }

  const markSize = markSizes[size];
  const mark = (
    <Image
      src="/brand/chairbook-mark.svg"
      alt={variant === "mark" ? ariaLabel : ""}
      aria-hidden={variant === "horizontal" ? true : undefined}
      width={markSize}
      height={markSize}
      className={markClassName}
      unoptimized
      style={{ display: "block", width: markSize, height: markSize, flex: "0 0 auto" }}
    />
  );

  if (variant === "mark") {
    return mark;
  }

  return (
    <span
      className={className}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: gaps[size],
        color: "currentColor",
        lineHeight: 1,
        ...style,
      }}
    >
      {mark}
      <span
        className={textClassName}
        aria-hidden="true"
        style={{
          color: "currentColor",
          fontSize: textSizes[size],
          fontWeight: 600,
          letterSpacing: 0,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        ChairBook
      </span>
    </span>
  );
}
