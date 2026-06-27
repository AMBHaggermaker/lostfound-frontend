const BASE = 'https://lostfound.unprecedentedtimes.org/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

const get  = (path, token)       => request('GET',    path, undefined, token);
const post = (path, body, token) => request('POST',   path, body,      token);
const patch= (path, body, token) => request('PATCH',  path, body,      token);
const del  = (path, token)       => request('DELETE', path, undefined, token);

function multipart(method, path, formData, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { method, headers, body: formData })
    .then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    });
}

export default {
  // Cases
  getCases:    (params, token)         => get(`/cases${qs(params)}`, token),
  getMapCases: (params)               => get(`/cases/map${qs(params)}`),
  getClusters: ()                     => get('/cases/clusters'),
  getCase:     (id, token)             => get(`/cases/${id}`, token),
  createCase:  (formData, token)       => multipart('POST', '/cases', formData, token),
  updateStatus:(id, status, token)     => patch(`/cases/${id}/status`, { status }, token),
  deleteCase:  (id, token)             => del(`/cases/${id}`, token),
  addPhotos:   (id, formData, token)   => multipart('POST', `/cases/${id}/photos`, formData, token),

  // Tips
  getTips:     (caseId, token)           => get(`/cases/${caseId}/tips`, token),
  addTip:      (caseId, formData, token) => multipart('POST', `/cases/${caseId}/tips`, formData, token),
  deleteTip:   (caseId, tipId, token)    => del(`/cases/${caseId}/tips/${tipId}`, token),
  verifyTip:   (caseId, tipId, token)    => patch(`/cases/${caseId}/tips/${tipId}/verify`, {}, token),
  pinTip:      (caseId, tipId, token)    => patch(`/cases/${caseId}/tips/${tipId}/pin`, {}, token),

  // AI briefing
  getBriefing: (caseId, token)         => get(`/cases/${caseId}/briefing`, token),

  // PDF export URL (opened directly in browser)
  exportUrl:   (caseId)                => `${BASE}/cases/${caseId}/export`,

  // Urgent strip SPI
  getUrgent:   ()                      => get('/urgent'),
};
