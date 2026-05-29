import React from 'react';
import SectionRefreshButton from '../dashboard/SectionRefreshButton';

export default function ShopFormSectionHead({ step, title, subtitle, onRefresh, refreshing = false }) {
  return (
    <div className="shop-dash-form-block-head">
      <span className="shop-dash-form-step">{step}</span>
      <div className="shop-dash-form-block-head-text">
        <h4>{title}</h4>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <SectionRefreshButton
        className="shop-dash-section-refresh"
        onRefresh={onRefresh}
        loading={refreshing}
      />
    </div>
  );
}
