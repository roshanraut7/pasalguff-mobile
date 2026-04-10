declare module '*.svg' {
    import React from 'react';
    import { SvgProps } from 'react-native-svg';
    const SVG: React.FC<SvgProps>;
    export default SVG;
}