/**
 * A person, drawn by somebody who can draw.
 *
 * Six hand-written attempts at a figure for the try-on section produced, in order: a mannequin
 * with a lollipop head, a bikini top, a green cartoon alien, and a curtain. The lesson is not
 * that a seventh would land it -- it is that figure drawing is a skill, and writing SVG path
 * data by hand without being able to see the result as you go is not a way to acquire it.
 *
 * This is Humaaans (MIT, https://www.humaaans.com), three body parts composed the way the
 * library composes them. Vendored rather than installed on purpose: the published package
 * declares react-scripts and React 16 as RUNTIME dependencies, and this app is on React 19.
 * Pulling a build toolchain into a production dependency tree to obtain three SVG fragments is
 * a bad trade. They are plain React.createElement calls with no hooks, so they render on 19
 * exactly as they did on 16.
 *
 * Only the clothes are recoloured, onto this shop's green. Skin and hair are left as drawn --
 * they are what make the figure read as a person, and they were not mine to improve.
 *
 * ---------------------------------------------------------------------------
 * Humaaans by Pablo Stanley. MIT License, Copyright (c) 2019 jktzes.
 * https://github.com/jktzes/humaaans
 * ---------------------------------------------------------------------------
 */
import React from 'react';

const Head = props => React.createElement("g", {
  id: "Head/Front/Long",
  stroke: "none",
  strokeWidth: 1,
  fill: "none",
  fillRule: "evenodd"
}, React.createElement("path", {
  d: "M95.7620125,45.2901669 C99.2090333,57.9923169 103.701116,86.5437798 99.1172687,91.0224659 L70.1172687,91.0224659 C70.1143073,90.9710129 70.1114038,90.9196907 70.108558,90.8684989 C59.3599056,89.678999 51,80.5657798 51,69.5 L51,48.5 C51,36.6258779 60.6258779,27 72.5,27 L74.5,27 C85.2832975,27 94.2124503,34.9385375 95.7620125,45.2901669 Z",
  id: "Hair-Back",
  fill: "#191847"
}), React.createElement("g", {
  id: "Head",
  transform: "translate(54.000000, 31.000000)",
  fill: "#B28B67"
}, React.createElement("path", {
  d: "M8.26227388,34.4901268 C3.65436435,29.0813759 0.535634794,22.4528771 1.05677633,15.0254539 C2.55833022,-6.37502057 32.3485306,-1.66718886 38.1433414,9.13393292 C43.9381521,19.9350547 43.249578,47.3329958 35.7603014,49.2634576 C32.7735882,50.033323 26.4110012,48.1474609 19.935372,44.244306 L24,73 L0,73 L8.26227388,34.4901268 Z"
})), React.createElement("path", {
  d: "M68.7499646,61.874834 C69.855742,73.75284 69.4127345,87.3172649 66.1172687,90.5371269 L37.1172687,90.5371269 C35.5014749,62.4634848 51.1172687,73.3348557 51.1172687,46.9027926 C52.0908529,45.9515442 53.0108111,45.0100255 53.9211179,44.1980592 L53.888877,43.4207004 C58.9105508,33.1402335 65.2813979,28 73.0014183,28 C84.581449,28 88.2365853,33.3883223 91.3486809,37.9630857 C89.0215226,45.9481754 79.9904303,47.1321867 71.9657406,52.1095118 C71.0198539,51.3410043 69.8137154,50.8804131 68.5,50.8804131 C65.4624339,50.8804131 63,53.3428469 63,56.3804131 C63,59.4179792 65.4624339,61.8804131 68.5,61.8804131 C68.5837722,61.8804131 68.6671069,61.8785402 68.7499646,61.874834 Z",
  id: "Hair-Front",
  fill: "#191847"
}));

const Torso = props => React.createElement("g", {
  id: "Body/Turtle-Neck",
  stroke: "none",
  strokeWidth: 1,
  fill: "none",
  fillRule: "evenodd"
}, React.createElement("path", {
  d: "M199.493124,92.4603344 L227.821028,120.095357 C236.063404,123.611168 242.816857,127.493333 248.081387,131.741853 C249.265301,133.169925 250.554184,135.906184 244.983927,134.681747 C239.413671,133.45731 233.49953,132.419902 232.45261,134.23139 C231.405691,136.042878 234.490525,138.818722 232.555688,141.189494 C231.265796,142.770009 226.92779,137.742701 219.54167,126.10757 L190.084396,108.74029 L199.493124,92.4603344 Z M60.9697919,67.4496834 L82.8671837,67.5318631 C66.1894326,121.56567 57.3363474,149.856914 56.3079281,152.405597 C53.9939846,158.140133 58.8906002,166.873732 60.9845874,171.567103 C54.1645409,174.61887 54.8912241,163.316929 46.2879189,167.319492 C38.4352209,170.972846 32.4616931,177.59248 23.3890352,171.994371 C22.2736052,171.306117 21.0512757,168.714714 24.0045784,166.68967 C31.3623323,161.644547 41.9653015,152.814672 43.3979297,149.908251 C45.3515741,145.944826 51.2088615,118.458637 60.9697919,67.4496834 Z",
  id: "Skin",
  fill: "#B28B67"
}), React.createElement("path", {
  d: "M122.768272,9.7139848 L131.253224,7.48281413 C149.019938,54.2642227 221.602897,80.8616426 227.451896,98.4190631 C229.596879,104.857833 225.154909,108.596168 227.774893,110.385298 L217.29519,119.561394 C215.205566,117.515062 211.513381,121.915723 202.815928,119.824345 C194.118475,117.732967 127.737533,66.5128914 122.768272,9.7139848 Z",
  id: "Clothes-Back",
  fill: "#164B1E",
  transform: "translate(175.413267, 63.943241) rotate(5.000000) translate(-175.413267, -63.943241) "
}), React.createElement("path", {
  d: "M142.240708,11.7336597 C141.243756,75.4830742 178.095832,91.7445602 169.887262,117.318245 C163.108761,138.436573 98.2273311,161.138686 87,140.43774 C82.4553197,132.058262 80.3933796,121.923875 80.1594269,110.905608 C77.2899563,119.370535 75.0205237,126.657823 73.3511268,132.767479 C70.4711839,143.30749 59.3062598,144.982871 59.3062598,149.043262 L44.5966299,144.982871 C45.5943495,139.466662 38.6598745,136.780597 40.5191881,124.456905 C48.8500046,69.239525 71.2334081,29.2141817 107.669398,4.38087468 L108.046347,-1.0097438 C108.200449,-3.21350145 110.111872,-4.87507585 112.315629,-4.72097411 L139.249859,-2.83754931 C141.453616,-2.68344757 143.115191,-0.772024866 142.961089,1.43173278 L142.240708,11.7336597 Z",
  id: "Clothes-Front",
  fill: "#227033"
}));

const Bottom = props => React.createElement("g", {
  id: "Bottom/Standing/Skinny-Jeans",
  stroke: "none",
  strokeWidth: 1,
  fill: "none",
  fillRule: "evenodd"
}, React.createElement("polygon", {
  id: "Leg",
  fill: "#191847",
  points: "128 9.9475983e-14 164.254962 127.226909 190.706957 221 210 221 181.890974 9.9475983e-14"
}), React.createElement("path", {
  d: "M118.304342,0 C117.465768,65.5742244 114.606247,101.340188 113.725779,107.297892 C112.845311,113.255595 99.5321718,151.156298 73.7863613,221 L93.7726468,221 C126.549033,153.996902 144.845651,116.096199 148.662499,107.297892 C152.479348,98.4995844 164.258515,62.7336205 182,0 L118.304342,0 Z",
  id: "Leg",
  fill: "#123F1B"
}), React.createElement("g", {
  id: "Accessories/Shoe/Flat-Pointy",
  transform: "translate(72.000000, 199.000000)",
  fill: "#191847"
}, React.createElement("path", {
  d: "M0,40 L1,19 L22,19 C31.9576033,26 44.9576033,31.6666667 61,36 L61,40 L23,40 L10,38 L10,40 L0,40 Z",
  id: "Shoe"
})), React.createElement("g", {
  id: "Accessories/Shoe/Flat-Pointy",
  transform: "translate(188.000000, 199.000000)",
  fill: "#191847"
}, React.createElement("path", {
  d: "M0,40 L1,19 L22,19 C31.9576033,26 44.9576033,31.6666667 61,36 L61,40 L23,40 L10,38 L10,40 L0,40 Z",
  id: "Shoe"
})));

/**
 * The composition, and the numbers are the library's own: a 380x480 standing frame, the whole
 * figure shifted by (40, 31), then head at (82, 0), bottom at (0, 187), torso at (22, 82).
 * Order matters -- the torso is drawn last so the blouse sits over the top of the skirt.
 */
export default function Humaaan({ style, className }) {
  return (
    <svg viewBox="0 0 380 480" className={className} style={style} aria-hidden="true">
      <g transform="translate(40.000000, 31.000000)">
        <g transform="translate(82.000000, 0.000000)"><Head /></g>
        <g transform="translate(0.000000, 187.000000)"><Bottom /></g>
        <g transform="translate(22.000000, 82.000000)"><Torso /></g>
      </g>
    </svg>
  );
}
