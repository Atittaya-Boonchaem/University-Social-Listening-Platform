import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function HeatmapCard({ heatmapPoints = [] }) {
  const phayaoCenter = [19.0289, 99.8967];

  const getColor = (intensity) => {
    switch (intensity) {
      case 'high':
        return '#dc2626'; // Deep red
      case 'medium':
        return '#9333ea'; // UP Purple
      default:
        return '#3b82f6'; // Blue
    }
  };

  const getRadius = (intensity) => {
    switch (intensity) {
      case 'high':
        return 16;
      case 'medium':
        return 12;
      default:
        return 9;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col h-[480px] relative overflow-hidden">
      {/* Card Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple-950 font-bold text-base md:text-lg">
            <span className="p-1.5 bg-purple-100 rounded-lg text-purple-800">
              <MapPin className="w-4 h-4" />
            </span>
            <span>จุดเกิดปัญหาสะสม (Heatmap)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            แผนที่แสดงการกระจายตัวของปัญหาที่ได้รับการแจ้งเข้ามาในพื้นที่มหาวิทยาลัยพะเยา
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
          ม.พะเยา (Phayao Campus)
        </span>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full rounded-xl overflow-hidden relative border border-slate-200/60 shadow-inner">
        <MapContainer
          center={phayaoCenter}
          zoom={14}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {heatmapPoints.map((pt) => (
            <CircleMarker
              key={pt.id}
              center={[pt.lat, pt.lng]}
              radius={getRadius(pt.intensity)}
              pathOptions={{
                fillColor: getColor(pt.intensity),
                fillOpacity: 0.8,
                color: '#ffffff',
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <strong className="block text-sm font-bold text-slate-900 mb-1">{pt.title}</strong>
                  <div className="text-slate-600">จำนวนการแจ้ง: <span className="font-bold text-purple-700">{pt.count} เรื่อง</span></div>
                  <div className="text-slate-500">ระดับความหนาแน่น: <span className="font-semibold capitalize">{pt.intensity}</span></div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend Box in Bottom Right matching mockup */}
        <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-md text-xs pointer-events-auto">
          <div className="font-bold text-slate-700 mb-1.5">ความหนาแน่น</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-medium">ต่ำ</span>
            <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-rose-600 shadow-inner"></div>
            <span className="text-[10px] text-slate-500 font-medium">สูง</span>
          </div>
        </div>
      </div>
    </div>
  );
}
