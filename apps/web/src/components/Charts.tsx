import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';

interface DataPoint {
  category: string;
  value: number;
  count?: number;
}

interface ChartProps {
  data: DataPoint[];
  title: string;
}

export function BarChart({ data, title }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root)
    ]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: false,
        wheelX: 'panX',
        wheelY: 'zoomX',
        paddingLeft: 0
      })
    );

    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {}));
    cursor.lineY.set('visible', false);

    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30,
      minorGridEnabled: true
    });

    xRenderer.labels.template.setAll({
      rotation: -45,
      centerY: am5.p50,
      centerX: am5.p100,
      paddingRight: 15
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        maxDeviation: 0.3,
        categoryField: 'category',
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 0.3,
        renderer: am5xy.AxisRendererY.new(root, {
          strokeOpacity: 0.1
        })
      })
    );

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: title,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'value',
        categoryXField: 'category',
        tooltip: am5.Tooltip.new(root, {
          labelText: '{categoryX}: {valueY}'
        })
      })
    );

    series.columns.template.setAll({
      cornerRadiusTL: 5,
      cornerRadiusTR: 5,
      strokeOpacity: 0
    });

    series.columns.template.adapters.add('fill', (_, target) => {
      return chart.get('colors')?.getIndex(series.columns.indexOf(target));
    });

    series.columns.template.adapters.add('stroke', (_, target) => {
      return chart.get('colors')?.getIndex(series.columns.indexOf(target));
    });

    xAxis.data.setAll(data);
    series.data.setAll(data);

    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [data, title]);

  return <div ref={chartRef} className="chart" />;
}

export function LineChart({ data, title }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root)
    ]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: false,
        wheelX: 'panX',
        wheelY: 'zoomX',
        paddingLeft: 0
      })
    );

    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {
      behavior: 'none'
    }));
    cursor.lineY.set('visible', false);

    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30
    });

    xRenderer.labels.template.setAll({
      rotation: -45,
      centerY: am5.p50,
      centerX: am5.p100,
      paddingRight: 15
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        maxDeviation: 0.3,
        categoryField: 'category',
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 0.3,
        renderer: am5xy.AxisRendererY.new(root, {
          strokeOpacity: 0.1
        })
      })
    );

    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: title,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'value',
        categoryXField: 'category',
        tooltip: am5.Tooltip.new(root, {
          labelText: '{categoryX}: {valueY}'
        })
      })
    );

    series.strokes.template.setAll({
      strokeWidth: 3
    });

    series.bullets.push(() => {
      return am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 5,
          fill: series.get('fill')
        })
      });
    });

    xAxis.data.setAll(data);
    series.data.setAll(data);

    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [data, title]);

  return <div ref={chartRef} className="chart" />;
}
