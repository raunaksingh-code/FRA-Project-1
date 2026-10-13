import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export interface PlotlyChartProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  className?: string;
  style?: React.CSSProperties;
}

export function PlotlyChart({
  data,
  layout = {},
  config = {},
  className = 'w-full h-80',
  style,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const defaultLayout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: { l: 50, r: 25, t: 30, b: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 11,
        color: '#475569',
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'right',
        x: 1,
        font: { size: 11, color: '#334155' },
      },
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#334155',
        font: { family: 'monospace', size: 11, color: '#f8fafc' },
      },
      ...layout,
    };

    const defaultConfig: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...config,
    };

    Plotly.react(containerRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, layout, config]);

  return <div ref={containerRef} className={className} style={style} />;
}
