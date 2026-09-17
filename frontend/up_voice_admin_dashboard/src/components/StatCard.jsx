import React from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;
