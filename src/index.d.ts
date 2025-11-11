// Type definitions for mdeditor

import { ClassAttributes, CSSProperties, HTMLAttributes } from 'react';
import { ExtraProps } from 'react-markdown';

export interface MarkdownRendererProps {
    children: string;
    className?: string;
}

export type CodeProps = ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps & {
    inline: boolean;
    style?: CSSProperties;
};
