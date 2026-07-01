import React from 'react';

const UserManagement = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 mt-1">Manage administrators, staff, and students.</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Add User
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-sm font-medium text-gray-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">John Doe {i}</td>
                <td className="p-4 text-gray-500">john.doe{i}@up.ac.th</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium text-xs">
                    {i === 1 ? 'Admin' : 'Student'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium text-xs">
                    Active
                  </span>
                </td>
                <td className="p-4 text-indigo-600 hover:text-indigo-900 font-medium cursor-pointer">
                  Edit
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
