import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Por favor ingrese un correo valido',
    'any.required': 'El correo es requerido',
  }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .required()
    .messages({
      'string.min': 'La contraseña debe ser mayor a 8 caracteres',
      'string.pattern.base':
        'La contraseña debe algun caracter mayúscula, minúscula, número y un caracter especial',
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required(),
  role: Joi.string()
    .min(2).max(10).required(),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required(),
})
  .required()
  .messages({
    'object.base': 'Request body must be a valid object',
    'any.required': 'Request body is required',
    'object.unknown': 'Invalid fields provided in request body',
  });

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const changePassword = Joi.object({
  idUser: Joi.number()
    .required()
    .messages({
      'string.required': 'El id del usuario es requerido'
    }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .required()
    .messages({
      'string.min': 'La contraseña debe ser mayor a 8 caracteres',
      'string.pattern.base':
      'La contraseña debe algun caracter mayúscula, minúscula, número y un caracter especial',
      'string.required': 'La contraseña es requerida'
    }),
  repeatPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .required()
    .messages({
      'string.min': 'La contraseña debe ser mayor a 8 caracteres',
      'string.pattern.base':
        'La contraseña debe algun caracter mayúscula, minúscula, número y un caracter especial',
        'string.required': 'La contraseña es requerida'
    }),
  oldPassword: Joi.string() 
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'La contraseña debe ser mayor a 8 caracteres',
      'string.required': 'La contraseña anterior es requerida'
    })

})
