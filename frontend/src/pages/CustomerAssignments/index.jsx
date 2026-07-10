import React from 'react';
import Administration from './Administration';
import ReportsView from './ReportsView';

const CustomerAssignments = () => {
    return <Administration ReportsView={ReportsView} />;
};

export default CustomerAssignments;
