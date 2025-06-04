{{/*
Expand the name of the chart.
*/}}
{{- define "kube-user-admin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kube-user-admin.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kube-user-admin.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kube-user-admin.labels" -}}
helm.sh/chart: {{ include "kube-user-admin.chart" . }}
{{ include "kube-user-admin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kube-user-admin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kube-user-admin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "kube-user-admin.backend.labels" -}}
{{ include "kube-user-admin.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "kube-user-admin.backend.selectorLabels" -}}
{{ include "kube-user-admin.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "kube-user-admin.frontend.labels" -}}
{{ include "kube-user-admin.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "kube-user-admin.frontend.selectorLabels" -}}
{{ include "kube-user-admin.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kube-user-admin.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kube-user-admin.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create backend image name
*/}}
{{- define "kube-user-admin.backend.image" -}}
{{- if .Values.image.registry }}
{{- printf "%s/%s-%s:%s" .Values.image.registry .Values.image.repository .Values.backend.image.repository (.Values.backend.image.tag | default .Values.image.tag) }}
{{- else }}
{{- printf "%s-%s:%s" .Values.image.repository .Values.backend.image.repository (.Values.backend.image.tag | default .Values.image.tag) }}
{{- end }}
{{- end }}

{{/*
Create frontend image name
*/}}
{{- define "kube-user-admin.frontend.image" -}}
{{- if .Values.image.registry }}
{{- printf "%s/%s-%s:%s" .Values.image.registry .Values.image.repository .Values.frontend.image.repository (.Values.frontend.image.tag | default .Values.image.tag) }}
{{- else }}
{{- printf "%s-%s:%s" .Values.image.repository .Values.frontend.image.repository (.Values.frontend.image.tag | default .Values.image.tag) }}
{{- end }}
{{- end }}

{{/*
Create backend API URL for frontend
*/}}
{{- define "kube-user-admin.backend.url" -}}
{{- printf "http://%s-backend:%d" (include "kube-user-admin.fullname" .) (.Values.backend.service.port | int) }}
{{- end }} 