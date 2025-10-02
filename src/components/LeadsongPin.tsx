import * as React from "react";
import Svg, { Rect, Path, Circle } from "react-native-svg";

type Props = {
  /** Overall height of the pin, including the point */
  size?: number;                 // default ~48
  /** Pin (teardrop) fill color */
  pinColor?: string;             // default "#7755D0" (your purple)
  /** Icon (microphone) color */
  iconColor?: string;            // default "#FFFFFF"
  /** Optional drop shadow behind the pin */
  shadow?: boolean;              // default false
  style?: any;
};

/**
 * Leadsong teardrop pin with singer-style microphone icon.
 * - Teardrop path matches a modern map-pin silhouette.
 * - Icon is a round head + slim stem + small round "button" cutout + tapered handle.
 * - ViewBox is normalized; scaling is handled via the `size` prop.
 */
export default function LeadsongPin({
  size = 48,
  pinColor = "#7755D0",
  iconColor = "#FFFFFF",
  shadow = false,
  style,
}: Props) {
  // The viewBox is 0..100 wide x 0..122 tall so the tip sits exactly at y=122.
  // Tip is horizontally centered at x=50.
  return (
    <Svg width={(size * 100) / 122} height={size} viewBox="0 0 100 122" style={style}>
      {/* Optional soft shadow */}
      {shadow && (
        <Path
          d="M50 122c18 0 32 4 32 9s-14 9-32 9-32-4-32-9 14-9 32-9z"
          fill="black"
          opacity={0.15}
        />
      )}

      {/* PIN BODY */}
      <Path
        // Smooth teardrop (top bulb -> narrow point at bottom).
        // This path yields a classic pin: circular top, tapered tail.
        d="
          M50,8
          C73,8 92,27 92,50
          C92,78 66,100 53,120
          C52,122 48,122 47,120
          C34,100 8,78 8,50
          C8,27 27,8 50,8
          Z
        "
        fill={pinColor}
      />

      {/* MICROPHONE ICON - Simple karaoke/singer handheld mic */}
      {/* Rounded head/ball top */}
      <Circle cx="50" cy="38" r="11" fill={iconColor} />
      {/* Mesh grille (simple grid) */}
      <Path 
        d="M42 35 L58 35 M42 38 L58 38 M42 41 L58 41 M42 44 L58 44"
        stroke={pinColor}
        strokeWidth="1"
        opacity="0.5"
      />
      {/* Gap between head and body (purple shows through) */}
      {/* Tapered handle body (wider and longer) */}
      <Path 
        d="M43 52 L57 52 L54 80 Q50 82 50 82 Q50 82 46 80 Z"
        fill={iconColor}
      />
      {/* Purple button on body */}
      <Circle cx="50" cy="64" r="2.5" fill={pinColor} />
    </Svg>
  );
}

