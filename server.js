var express  = require('express'); 
var app = express(); 
var mysql = require('mysql2');
var path = require('path');
var router = express.Router();


// параметры соединения с бд
var config = {
    host: 'localhost',
    user: 'dima',
    password: '11111111111',
    database: 'Library',
    port: 3306,
    waitForConnections: true,  // Ожидать соединения
    connectionLimit: 10,       // Максимальное количество соединений в пуле
    queueLimit: 0              // Неограниченное количество запросов в очереди
};

// Создание пула соединений (один раз)
var pool = mysql.createPool(config);



app.listen(8080, function() { 
	console.log('app listening on port: 8080'); 
}); 



// Функция для обработки запросов
function handleQuery(query, htmlBuilder, response) {
    var html = '';
     // Стриминг запроса к базе данных
    var queryStream = pool.query(query).stream();

    queryStream.on('fields', function(fields) {
        console.log('Колонки: ', fields); // Содержит информацию о колонках
    });


        // Обработчик строки (аналог MSSQL `row`)
    queryStream.on('data', function(row) {
        html += htmlBuilder(row);
    });


    
     // Обработчик ошибок
    queryStream.on('error', function(err) {
        console.error('Ошибка: ', err);
        response.status(500).send('Ошибка запроса');
    });



      // Обработчик завершения
    queryStream.on('end', function() {
        response.send(html); // Отправляем накопленный HTML-код
        console.log('done');
    });
}



app.use(router);

router.route('/books')
.get(function(request, response){
    handleQuery('SELECT * FROM Students', function(row) {
        return `<h2>Name: ${row.FirstName} ${row.LastName}</h2>`;
    }, response);

});

router.route('/books')
.get(function(request, response){
    handleQuery('SELECT * FROM books', function(row) {
        return `<h2>Name: ${row.Name} Pages: ${row.Pages} Year: ${row.YearPress}</h2>`;
    }, response);

});

router.route('/students')
.get(function(request, response){
    handleQuery('SELECT * FROM Students', function(row) {
        return `<h2>Name: ${row.FirstName} ${row.LastName} ID: ${row.Id}</h2>`;
    }, response);

});

router.route('/faculties')
.get(function(request, response){
    handleQuery('SELECT * FROM Faculties', function(row) {
        return `<h2>Name: ${row.Name}</h2>`;
    }, response);

});

router.route('/teachers')
.get(function(request, response){
    handleQuery('SELECT * FROM Libs', function(row) {
        return `<h2>Name: ${row.FirstName} ${row.LastName}</h2>`;
    }, response);

});


app.get('/groups/students/:Id', function(request, response) {
    var studentId = request.params.Id;

    pool.query('SELECT * FROM Students WHERE Id = ?', [studentId], function(err, results) {
            if (err) {
            console.error('Ошибка запроса: ', err);
            return response.status(500).send('Ошибка сервера');
        }

        if (results.length === 0) {
            return response.status(404).send('Студент не найден');
        }
        var student = results[0];
        var html = `<h2>Name: ${student.FirstName} ${student.LastName}</h2>`;
        response.send(html);
    }, response);
});





app.get('/authors/:lastName', function(request, response) {
    var LastName = request.params.lastName;

    pool.query(`
        SELECT books.Name AS BookName
        FROM books
        JOIN authors ON books.Id_Author = authors.id
        WHERE authors.lastName = ?`, [LastName], function(err, results) {
        
        if (err) {
            console.error('Ошибка запроса: ', err);
            return response.status(500).send('Ошибка сервера');
        }

        if (results.length === 0) {
            return response.status(404).send('Книги автора не найдены');
        }

        // Формируем HTML для всех книг автора
        var html = `<h2>Книги автора с фамилией: ${LastName}</h2>`;
        html += '<ul>';
        results.forEach(function(book) {
            html += `<li>${book.BookName}</li>`;
        });
        html += '</ul>';

        response.send(html);
    });
});



 



// Закрытие пула при завершении работы приложения
process.on('SIGINT', function() {
    pool.end(function(err) {
        if (err) throw err;
        console.log('Пул соединений закрыт.');
        process.exit(0);
    });
});



