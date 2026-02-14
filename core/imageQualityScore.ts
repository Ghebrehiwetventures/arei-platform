// ============================================
// IMAGE QUALITY SCORE v1 (FROZEN SPEC)
// ============================================

export type ImageQualityTier = "A" | "B" | "C" | "D";

export interface ImageQualityScore {
  score: number; // 0-100
  tier: ImageQualityTier;
  reasons: string[];
  computed_at: string;
}

interface ImageAnalysis {
  url: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isScreenshot: boolean;
  isPlaceholder: boolean;
}

// Deterministic URL-based heuristics for image analysis
function analyzeImageUrl(url: string): ImageAnalysis {
  const lower = url.toLowerCase();
  
  // Check for screenshot indicators
  const isScreenshot = 
    lower.includes("screenshot") ||
    lower.includes("screen-shot") ||
    lower.includes("capture") ||
    lower.includes("overlay");
  
  // Check for placeholder/logo indicators
  const isPlaceholder = 
    lower.includes("placeholder") ||
    lower.includes("logo") ||
    lower.includes("watermark") ||
    lower.includes("default") ||
    lower.includes("no-image") ||
    lower.includes("coming-soon");
  
  // Extract dimension hints from URL (e.g., 1200x800, 800w, etc.)
  const dimensionMatch = lower.match(/(\d{3,4})[x_-](\d{3,4})/);
  let width: number | undefined;
  let height: number | undefined;
  
  if (dimensionMatch) {
    width = parseInt(dimensionMatch[1], 10);
    height = parseInt(dimensionMatch[2], 10);
  } else {
    // Try width-only pattern (e.g., 1200w)
    const widthMatch = lower.match(/(\d{3,4})w/);
    if (widthMatch) {
      width = parseInt(widthMatch[1], 10);
    }
  }
  
  const aspectRatio = width && height ? width / height : undefined;
  
  return {
    url,
    width,
    height,
    aspectRatio,
    isScreenshot,
    isPlaceholder,
  };
}

function isExtremeAspectRatio(ratio: number | undefined): boolean {
  if (!ratio) return false;
  // Extreme if wider than 3:1 or taller than 1:3
  return ratio > 3 || ratio < 0.33;
}

function getMedianResolution(analyses: ImageAnalysis[]): number | undefined {
  const resolutions = analyses
    .map((a) => {
      if (a.width && a.height) {
        return Math.min(a.width, a.height);
      }
      return a.width;
    })
    .filter((r): r is number => r !== undefined);
  
  if (resolutions.length === 0) return undefined;
  
  resolutions.sort((a, b) => a - b);
  const mid = Math.floor(resolutions.length / 2);
  return resolutions.length % 2 === 0
    ? (resolutions[mid - 1] + resolutions[mid]) / 2
    : resolutions[mid];
}

function detectDuplicates(urls: string[]): boolean {
  // Simple URL-based duplicate detection
  // Check if >30% of images are duplicates
  const uniqueUrls = new Set(urls);
  const duplicateRatio = (urls.length - uniqueUrls.size) / urls.length;
  return duplicateRatio > 0.3;
}

export function computeImageQualityScore(imageUrls: string[]): ImageQualityScore {
  const computed_at = new Date().toISOString();
  let score = 0;
  const reasons: string[] = [];
  
  // No images case
  if (imageUrls.length === 0) {
    return {
      score: 0,
      tier: "D",
      reasons: ["low_image_count"],
      computed_at,
    };
  }
  
  // Analyze all images
  const analyses = imageUrls.map(analyzeImageUrl);
  
  // 1. Image count scoring
  if (imageUrls.length >= 8) {
    score += 20;
  } else if (imageUrls.length >= 4) {
    score += 10;
  } else {
    reasons.push("low_image_count");
  }
  
  // 2. Resolution scoring (median)
  const medianRes = getMedianResolution(analyses);
  if (medianRes !== undefined) {
    if (medianRes >= 1200) {
      score += 20;
    } else if (medianRes >= 800) {
      score += 10;
    } else {
      score -= 10;
      reasons.push("low_resolution");
    }
  }
  
  // 3. Aspect ratio sanity
  const extremeRatios = analyses.filter((a) => isExtremeAspectRatio(a.aspectRatio));
  if (extremeRatios.length > 0) {
    score -= 10;
    reasons.push("bad_aspect_ratio");
  } else {
    score += 10;
  }
  
  // 4. Screenshot detection
  const screenshots = analyses.filter((a) => a.isScreenshot);
  if (screenshots.length > 0) {
    score -= 15;
    reasons.push("screenshot_detected");
  } else {
    score += 10;
  }
  
  // 5. Duplicate detection
  if (detectDuplicates(imageUrls)) {
    score -= 10;
    reasons.push("duplicate_images");
  }
  
  // 6. Placeholder/logo detection
  const placeholders = analyses.filter((a) => a.isPlaceholder);
  if (placeholders.length > 0) {
    score -= 20;
    reasons.push("placeholder_or_logo");
  }
  
  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Determine tier
  let tier: ImageQualityTier;
  if (score >= 80) {
    tier = "A";
  } else if (score >= 60) {
    tier = "B";
  } else if (score >= 40) {
    tier = "C";
  } else {
    tier = "D";
  }
  
  return {
    score,
    tier,
    reasons,
    computed_at,
  };
}
