export type GradeLevel = "grade9" | "grade10" | "grade11" | "grade12";

export interface Point2D {
  x: number;
  y: number;
  label?: string;
  color?: string;
  isDashedToAxes?: boolean;
}

export interface AsymptoteLine {
  type: "vertical" | "horizontal" | "slant";
  value?: number; // for vertical: x = val, for horizontal: y = val
  m?: number; // for slant: y = mx + c
  c?: number;
  label: string;
  color?: string;
}

export interface FunctionPlotData {
  id: string;
  fn: (x: number) => number;
  color?: string;
  width?: number;
  dashed?: boolean;
  discontinuities?: number[]; // x values where function is discontinuous (e.g. vertical asymptotes)
  domain?: [number, number];
  label?: string;
}

export interface InequalityConstraint {
  id: string;
  a: number; // ax + by + c <= 0 or >= 0 or < 0 or > 0
  b: number;
  c: number;
  operator: "<=" | ">=" | "<" | ">";
  color?: string;
}

export interface PolygonVertex {
  x: number;
  y: number;
  label: string;
  fValue?: number;
  isOptimalMax?: boolean;
  isOptimalMin?: boolean;
}

export type Shape3DType = 
  | "pyramid_triangle"      // S.ABC
  | "pyramid_quad"          // S.ABCD
  | "pyramid_regular_tri"   // Chóp tam giác đều
  | "pyramid_regular_quad"  // Chóp tứ giác đều
  | "prism_triangular"      // Lăng trụ tam giác ABC.A'B'C'
  | "cuboid";               // Hình hộp chữ nhật / lập phương ABCD.A'B'C'D'

export interface Point3D {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
  labelOffset?: { x: number; y: number };
}

export interface Edge3D {
  from: string;
  to: string;
  dashed?: boolean;
  color?: string;
  style?: "normal" | "accent" | "altitude";
}
