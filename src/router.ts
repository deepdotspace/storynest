// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `*`
  | `/`
  | `/admin`
  | `/book/:id/edit`
  | `/book/:id/read`
  | `/create`
  | `/explore`
  | `/library`
  | `/settings`
  | `/upgrade`

export type Params = {
  '/*': { '*': string }
  '/book/:id/edit': { id: string }
  '/book/:id/read': { id: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
