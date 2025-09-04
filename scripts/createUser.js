//Estes es un script para insertar los usuarios de manera inicial a la db para
//probar rutas solo se deben cambiar la tabla a la cual se va hacer la query

const bcrypt = require('bcrypt');
const pool = require('../db');
//Creamos una funcion fecha
const crearUsuario = async () => {
  //asignamos datos a las variables que deben considir con los de la tabla para la incersion 
  const name = 'Cliente1';
  const email = 'cliente@empresa.com';
  const phone = '30000000';
  const password = '987456'; 
 //const role = 'admin';//pones rol si es un usuario interno si es un usuario cliente no

  try {
    //hash para el pass
    const hashedPassword = await bcrypt.hash(password, 10);
/*creamos una funcion para con pool donde enviamos la query como parametro
   const result = await pool.query(
      `INSERT INTO customers (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, hashedPassword, role]
    );*/
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, password)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, phone, hashedPassword]
    );
//enviamos un mensaje si se crea el usuario 
    console.log(' Usuario creado:', result.rows[0]);
    process.exit(); // cerrar script
    //enviamos error de lo contrario
  } catch (error) {
    console.error(' Error al crear usuario:', error.message);
    process.exit(1);
  }
};

crearUsuario();
