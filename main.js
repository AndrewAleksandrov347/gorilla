// Конфигурация Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let gorilla; // Спрайт гориллы
let humans; // Группа людей
let cursors; // Управление
let spaceKey; // Клавиша пробел
let lives; // Жизни гориллы
let killedHumans = 0; // Убитые люди
let totalHumans = 100; // Всего людей
let difficulty; // Уровень сложности: 'easy', 'medium', 'hard'
let livesText; // Текст жизней
let scoreText; // Текст счета
let gameOver = false; // Флаг конца игры
let humanSpawnTimer; // Таймер спавна людей
let currentWave = 0; // Текущий этап сложности

let gorillaTexture; // Текстура для гориллы
let humanTexture; // Текстура для человека
let backgroundGraphics; // Графика фона

function preload() {
    // Нет загрузки файлов - все рисуем в create
}

function create() {
    // Создаем фон программно (джунгли: зеленый градиент с деревьями)
    backgroundGraphics = this.add.graphics();
    backgroundGraphics.fillGradientStyle(0x228B22, 0x228B22, 0x006400, 0x006400, 1);
    backgroundGraphics.fillRect(0, 0, 800, 600);
    // Деревья (простые прямоугольники и треугольники)
    backgroundGraphics.fillStyle(0x8B4513, 1); // Коричневый ствол
    backgroundGraphics.fillRect(50, 400, 20, 200);
    backgroundGraphics.fillStyle(0x228B22, 1); // Зеленая крона
    backgroundGraphics.fillTriangle(40, 400, 60, 350, 80, 400);
    backgroundGraphics.fillTriangle(30, 350, 60, 300, 90, 350);
    // Повторить для нескольких деревьев
    backgroundGraphics.fillStyle(0x8B4513, 1);
    backgroundGraphics.fillRect(700, 400, 20, 200);
    backgroundGraphics.fillStyle(0x228B22, 1);
    backgroundGraphics.fillTriangle(690, 400, 710, 350, 730, 400);
    backgroundGraphics.fillTriangle(680, 350, 710, 300, 740, 350);

    // Создаем текстуру для гориллы (64x64)
    const gorillaGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    gorillaGraphics.fillStyle(0x8B4513, 1); // Коричневый для тела
    gorillaGraphics.fillRect(10, 10, 44, 44); // Тело
    gorillaGraphics.fillStyle(0xA9A9A9, 1); // Серый живот
    gorillaGraphics.fillRect(15, 30, 34, 20);
    gorillaGraphics.fillStyle(0x000000, 1); // Глаза
    gorillaGraphics.fillRect(20, 15, 5, 5);
    gorillaGraphics.fillRect(40, 15, 5, 5);
    gorillaGraphics.generateTexture('gorilla', 64, 64);

    // Создаем текстуру для человека (32x32)
    const humanGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    humanGraphics.fillStyle(0xFFD700, 1); // Желтый для тела
    humanGraphics.fillRect(10, 10, 12, 12); // Голова
    humanGraphics.fillRect(10, 22, 12, 10); // Туловище
    humanGraphics.lineStyle(2, 0x000000, 1); // Руки и ноги
    humanGraphics.lineBetween(10, 22, 5, 30); // Левая рука
    humanGraphics.lineBetween(22, 22, 27, 30); // Правая рука
    humanGraphics.lineBetween(10, 32, 5, 40); // Левая нога
    humanGraphics.lineBetween(22, 32, 27, 40); // Правая нога
    humanGraphics.generateTexture('human', 32, 32);

    // Анимации (упрощенные, без кадров)
    this.anims.create({
        key: 'gorilla_idle',
        frames: [{ key: 'gorilla' }],
        frameRate: 1
    });
    this.anims.create({
        key: 'gorilla_catch',
        frames: [{ key: 'gorilla' }],
        frameRate: 1
    });
    this.anims.create({
        key: 'gorilla_throw',
        frames: [{ key: 'gorilla' }],
        frameRate: 1
    });
    this.anims.create({
        key: 'gorilla_hit',
        frames: [{ key: 'gorilla' }],
        frameRate: 1
    });

    this.anims.create({
        key: 'human_run',
        frames: [{ key: 'human' }],
        frameRate: 1
    });
    this.anims.create({
        key: 'human_fly',
        frames: [{ key: 'human' }],
        frameRate: 1
    });

    // Показать меню выбора сложности
    showMenu(this);
}

function showMenu(scene) {
    // Текст меню
    const menuText = scene.add.text(400, 200, 'Выбор сложности', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    const easyButton = scene.add.text(400, 300, 'Легкий', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    const mediumButton = scene.add.text(400, 350, 'Средний', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    const hardButton = scene.add.text(400, 400, 'Тяжелый', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive();

    easyButton.on('pointerdown', () => startGame(scene, 'easy'));
    mediumButton.on('pointerdown', () => startGame(scene, 'medium'));
    hardButton.on('pointerdown', () => startGame(scene, 'hard'));
}

function startGame(scene, diff) {
    difficulty = diff;
    killedHumans = 0;
    gameOver = false;
    currentWave = 0;

    // Установить жизни по сложности
    if (difficulty === 'easy') lives = 5;
    else if (difficulty === 'medium') lives = 4;
    else lives = 3;

    // Очистить меню
    scene.children.list.forEach(child => {
        if (child.type === 'Text') child.destroy();
    });

    // Создать гориллу
    gorilla = scene.physics.add.sprite(100, 300, 'gorilla');
    gorilla.setCollideWorldBounds(true);
    gorilla.play('gorilla_idle');
    gorilla.body.setAllowGravity(false); // Нет гравитации

    // Группа людей
    humans = scene.physics.add.group();

    // Управление
    cursors = scene.input.keyboard.createCursorKeys();
    spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Текст UI
    scoreText = scene.add.text(16, 16, 'Убито людей: 0/100', { fontSize: '20px', fill: '#fff' });
    livesText = scene.add.text(16, 48, 'Жизни: ' + '♥'.repeat(lives), { fontSize: '20px', fill: '#fff' });

    // Таймер спавна людей
    spawnHumans(scene);
    humanSpawnTimer = scene.time.addEvent({ delay: getSpawnInterval(), callback: () => spawnHumans(scene), loop: true });
}

function update() {
    if (gameOver) return;

    // Движение гориллы вверх-вниз
    if (cursors.up.isDown) {
        gorilla.setVelocityY(-200);
    } else if (cursors.down.isDown) {
        gorilla.setVelocityY(200);
    } else {
        gorilla.setVelocityY(0);
    }

    // Проверка коллизий с людьми
    this.physics.overlap(gorilla, humans, handleCollision, null, this);

    // Обновить текст
    scoreText.setText('Убито людей: ' + killedHumans + '/100');
    livesText.setText('Жизни: ' + '♥'.repeat(lives));

    // Победа или поражение
    if (killedHumans >= totalHumans) {
        endGame(this, true);
    } else if (lives <= 0) {
        endGame(this, false);
    }

    // Обновить сложность по прогрессу
    updateDifficulty();
}

function spawnHumans(scene) {
    const numHumans = getNumHumansPerWave();
    for (let i = 0; i < numHumans; i++) {
        const y = Phaser.Math.Between(50, 550); // Случайная высота
        const human = humans.create(800, y, 'human');
        human.play('human_run');
        human.setVelocityX(-getHumanSpeed()); // Движение налево
        human.body.setAllowGravity(false);

        // Если диагональ (на поздних этапах)
        if (isDiagonalWave()) {
            human.setVelocityY(Phaser.Math.Between(-100, 100)); // Зигзаг
        }
    }
}

function handleCollision(gorilla, human) {
    if (spaceKey.isDown) {
        // Ловля и бросок
        gorilla.play('gorilla_catch');
        human.play('human_fly');
        human.setVelocityX(300); // Швыряет назад (парабола упрощена)
        human.setVelocityY(-100); // Вверх для параболы
        scene.time.delayedCall(500, () => {
            human.destroy();
            killedHumans++;
            gorilla.play('gorilla_throw');
            scene.time.delayedCall(300, () => gorilla.play('gorilla_idle'));
        });
    } else {
        // Удар по горилле
        human.destroy();
        lives--;
        gorilla.play('gorilla_hit');
        scene.time.delayedCall(500, () => gorilla.play('gorilla_idle'));
    }
}

function updateDifficulty() {
    if (killedHumans > 20 && currentWave < 1) {
        currentWave = 1;
        humanSpawnTimer.delay = getSpawnInterval();
    } else if (killedHumans > 50 && currentWave < 2) {
        currentWave = 2;
        humanSpawnTimer.delay = getSpawnInterval();
    } else if (killedHumans > 80 && currentWave < 3) {
        currentWave = 3;
        humanSpawnTimer.delay = getSpawnInterval();
    }
}

// Функции для расчета сложности (как в ТЗ)
function getNumHumansPerWave() {
    let base = [1, 2, 3, 4][currentWave];
    if (difficulty === 'easy') return Math.max(1, base - 1);
    if (difficulty === 'hard') return base + 1;
    return base;
}

function getHumanSpeed() {
    let base = [2, 3, 4, 5][currentWave] * 100; // px/sec approx
    if (difficulty === 'easy') return base * 0.5;
    if (difficulty === 'hard') return base * 1.2;
    return base;
}

function getSpawnInterval() {
    let base = [2000, 1500, 1000, 800][currentWave];
    if (difficulty === 'easy') return base * 1.2;
    if (difficulty === 'hard') return base * 0.8;
    return base;
}

function isDiagonalWave() {
    return currentWave >= 2; // Диагонали с 51+
}

function endGame(scene, win) {
    gameOver = true;
    humanSpawnTimer.remove();
    humans.clear(true, true);
    gorilla.destroy();

    const message = win ? 'Победа! Убито всех 100 людей.' : 'Игра окончена! Убито: ' + killedHumans + ' людей.';
    scene.add.text(400, 300, message, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Сохранить рекорд в localStorage
    const highScore = localStorage.getItem('highScore') || 0;
    if (killedHumans > highScore) localStorage.setItem('highScore', killedHumans);

    // Кнопка перезапуска
    const restartButton = scene.add.text(400, 400, 'Заново', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    restartButton.on('pointerdown', () => {
        scene.scene.restart();
        showMenu(scene);
    });
}
