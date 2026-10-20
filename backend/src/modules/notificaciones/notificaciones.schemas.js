const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');

const mias = z.object({ ...esquemaPaginacion, leida: z.enum(['0', '1']).optional() });

const enviar = z
  .object({
    destino: z.enum(['usuario', 'rol', 'todos'], {
      errorMap: () => ({ message: 'Elige el destinatario: un usuario, un rol o todos.' }),
    }),
    usuario_id: z.coerce.number().int().positive('Elige el usuario.').optional(),
    rol: z
      .enum(['administrador', 'operador', 'usuario'], {
        errorMap: () => ({ message: 'Elige el rol.' }),
      })
      .optional(),
    titulo: z
      .string({ required_error: 'Escribe el título.' })
      .trim()
      .min(3, 'El título debe tener al menos 3 caracteres.')
      .max(120, 'Máximo 120 caracteres.'),
    mensaje: z
      .string({ required_error: 'Escribe el mensaje.' })
      .trim()
      .min(3, 'El mensaje debe tener al menos 3 caracteres.')
      .max(1000, 'Máximo 1000 caracteres.'),
  })
  .superRefine((d, ctx) => {
    if (d.destino === 'usuario' && !d.usuario_id)
      ctx.addIssue({ code: 'custom', path: ['usuario_id'], message: 'Elige el usuario.' });
    if (d.destino === 'rol' && !d.rol)
      ctx.addIssue({ code: 'custom', path: ['rol'], message: 'Elige el rol.' });
  });

const params = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

module.exports = { mias, enviar, params };
