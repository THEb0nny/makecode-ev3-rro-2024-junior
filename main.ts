let MANIP_MOTOR_LEFT: motors.Motor = motors.mediumA; // Ссылка на объект мотора манипулятора
let MANIP_MOTOR_RIGHT: motors.Motor = motors.mediumD; // Ссылка на объект мотора манипулятора

let COLOR_DETECTION_CS = sensors.color2; // Ссылка на объект датчика цвета для определения цвета предмета

let parkElements: number[] = [0, 0, 0, 0, 0, 0]; // Парковые элементы

let colorDetectionCSParams = {
    colorBoundary: 65,
    whiteBoundary: 10,
    blackBoundary: 1,
    redBoundary: 25,
    brownBoundary: 50,
    yellowBoundary: 100,
    greenBoundary: 180,
    blueBoundary: 260
};

let leftClawElement = 0; // Какого цвета парковый элемент захватчен левым манипулятором
let rightClawElement = 0; // Какого цвета парковый элемент захватчен правым манипулятором
let parkZoneB: number[] = []; // Парковая зона B, ближняя к линии
let parkZoneA: number[] = []; // Парковая зона A, дальняя

// Установка коэффицентов умного поворота
chassis.smartSpinTurnSpeed = 50;
chassis.smartSpinTurnKp = 0.3;
chassis.smartSpinTurnKd = 2;
chassis.smartPivotTurnSpeed = 70;
chassis.smartPivotTurnKp = 0.5;
chassis.smartPivotTurnKd = 2;

// Коэффиценты для выравнивания на линии
levelings.lineAlignmentMaxSpeed = 40;
levelings.lineAlignmentLeftSideKp = 0.2;
levelings.lineAlignmentLeftSideKd = 0.3;
levelings.lineAlignmentRightSideKp = 0.2;
levelings.lineAlignmentRightSideKd = 0.3;

// Коэффиценты для позиционирования на линии
levelings.linePositioningMaxSpeed = 50;
levelings.linePositioningKp = 0.175;
levelings.linePositioningKd = 2;

// sensors.SetNxtLightSensorsAsLineSensors(sensors.nxtLight1, sensors.nxtLight4); // Установить датчики цвета в качестве датчиков линии

motions.SetDistRollingAfterInsetsection(50); // Дистанция для проезда после опредения перекрёстка для прокатки в мм
motions.SetDistRollingAfterIntersectionMoveOut(20); // Дистанция для прокатки без торможения на перекрёстке в мм

motions.SetLineFollowConditionMaxErr(50); // Максимальная ошибка при движении одним датчиком для определения перекрёстка

sensors.SetLineSensorRawRefValue(LineSensor.Left, 632, 459); // Установить левому датчику линии (цвета) сырые значения чёрного и белого
sensors.SetLineSensorRawRefValue(LineSensor.Right, 621, 479); // Установить правому датчику линии (цвета) сырые значения чёрного и белого

// sensors.SetColorSensorMinRgbValues(COLOR_DETECTION_CS, [0, 1, 2]); // Установить датчику определения фигур минимальные значения RGB

// sensors.SetColorSensorMaxRgbValues(COLOR_DETECTION_CS, [204, 190, 243]); // Установить датчику определения фигур максимальные значения RGB

chassis.setSeparatelyChassisMotors(motors.mediumB, motors.mediumC, true, false); // Установка моторов шасси и установка им реверсов
// chassis.setRegulatorGains(0.02, 0, 0.5); // Установить коэффиценты синхронизации моторов
chassis.setWheelRadius(62.4); // Диаметр колёс в мм
chassis.setBaseLength(180); // Расстояние между центрами колёс в мм

MANIP_MOTOR_LEFT.setInverted(true); MANIP_MOTOR_RIGHT.setInverted(false); // Установить инверсию для манипулятора, если требуется
MANIP_MOTOR_LEFT.setBrake(true); MANIP_MOTOR_RIGHT.setBrake(true); // Удержание моторов манипуляторов

function RgbToHsvlToColorConvert(debug: boolean = false): number {
    let rgbCS = COLOR_DETECTION_CS.rgbRaw();
    for (let i = 0; i < 3; i++) { // Нормализуем значения с датчика
        // rgbCS[i] = Math.map(rgbCS[i], sensors.minRgbColorSensor4[i], sensors.maxRgbColorSensor4[i], 0, 255);
        rgbCS[i] = Math.constrain(rgbCS[i], 0, 255);
    }
    const hsvlCS = sensors.RgbToHsvlConverter(rgbCS); // Получаем HSVL
    const color = sensors.HsvlToColorNum(hsvlCS, colorDetectionCSParams); // Переводим HSVL в цветовой код
    if (debug) {
        const column = 20;
        brick.clearScreen();
        brick.printValue("r", rgbCS[0], 1, column);
        brick.printValue("g", rgbCS[1], 2, column);
        brick.printValue("b", rgbCS[2], 3, column);
        brick.printValue("hue", hsvlCS[0], 5, column);
        brick.printValue("sat", hsvlCS[1], 6, column);
        brick.printValue("val", hsvlCS[2], 7, column);
        brick.printValue("light", hsvlCS[3], 8, column);
        brick.printValue("color", color, 10, column);
    }
    return color;
}

// Функция для управление манипулятором
function SetManipulatorPosition(motor: motors.Motor, state: ClawState, speed?: number, timeOut?: number) {
    if (!speed) speed = 40; // Если аргумент не был передан, то за скорость установится значение по умолчанию
    else speed = Math.abs(speed);
    if (!timeOut) timeOut = 2000; // Если аргумент не был передан, то за максимальное время ожидания остановки устанавливается это значение
    else timeOut = Math.abs(timeOut);
    motor.setBrake(true); // Устанавливаем ударжание мотора при остановке
    if (state == ClawState.Open) motor.run(speed); // Запускаем мотор
    else if (state == ClawState.Close) motor.run(-speed); // Запускаем мотор в другую сторону
    else return;
    motor.pauseUntilStalled(timeOut);
    motor.stop(); // Останавливаем мотор
}

//// Примеры установки параметров для методов с регулятором
// { speed: 50 } - только скорость
// { speed: 50, Kp: 0.5 } - скорость и Kp
// { speed: 50, Kp: 0.5, Kd: 2 } - скорость, Kp и Kd
// { speed: 50, Kp: 0.5, Ki: 0, Kd: 2 } - скорость, Kp, Ki, Kd

//// Примеры вызовов функций
// motions.LineFollowToIntersection(AfterMotion.Rolling, { speed: 50, Kp: 0.5, Kd: 2 }); // Движение по линии до перекрёстка со скоростью 70 и прокаткой
// motions.LineFollowToLeftIntersection(LineLocation.Inside, AfterMotion.Rolling); // Движение по линии на правом датчике до перекрёстка слева со скоростью 50 и с прокаткой
// motions.LineFollowToRightIntersection(LineLocation.Inside, AfterMotion.Rolling); // Движение по линии на левом датчике до перекрёстка справа со скоростью 60 и с прокаткой
// motions.LineFollowToDist(400, AfterMotion.BreakStop); // Движение по линии на расстояние со скоростью 50 и жёстким торможением после
// chassis.spinTurn(90, 30); // Поворот на 90 градусов вправо на скорости 30
// chassis.pivotTurn(90, 40, WheelPivot.LeftWheel); // Вращение на 90 градусов со скоростью 40 относительно левого мотора
// Manipulator(ClawState.Close); // Закрыть манипулятор со скоростью по умолчанию
// Manipulator(ClawState.Open, 60); // Открыть манипулятор с произвольной скоростью 60

function Main() { // Определение главной функции
    // Опрашиваем какое-то количество раз датчики, чтобы они включились перед стартом по нажатию кнопки
    for (let i = 0; i < 50; i++) {
        sensors.GetLineSensorRawRefValue(LineSensor.Left);
        sensors.GetLineSensorRawRefValue(LineSensor.Right);
        // COLOR_DETECTION_CS.rgbRaw();
        loops.pause(5);
    }

    // Ожидание старта
    brick.printString("PRESS ENTER TO RUN", 7, 6); // Вывести на экран сообщение о готовности
    while (true) {
        if (brick.buttonLeft.wasPressed()) custom.FunctionsTune(0, true);
        else if (brick.buttonUp.wasPressed()) sensors.SearchRgbMaxColorSensors();
        else if (brick.buttonDown.wasPressed()) {
            while (true) {
                let currTime = control.millis(); // Текущее время
                RgbToHsvlToColorConvert(true);
                control.pauseUntilTime(currTime, 10); // Ожидание выполнения цикла
            }
        } else if (brick.buttonRight.wasPressed()) break; // Ожидание нажатия правой кнопки, чтобы выйти и пойти дальше по коду
        loops.pause(0.001);
    }
    brick.clearScreen(); // Очистить экрана

    /*
    //// Ваш код тут
    // Закрываем манипуляторы прижимая кабель
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 5, 500);
    });
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 5, 500);
    });
    chassis.PivotTurn(90, 40, WheelPivot.RightWheel); pause(50); // Поворачиваем к линии
    const startEncLeftMot = chassis.leftMotor.angle(); // Запоминаем значение с энкодера левого мотора перед стартом  поиска парковых элементов
    const startEncRightMot = chassis.rightMotor.angle(); // Запоминаем значенис с энкодера правого мотора
    // Запускаем функцию определения цвета парковых элементов в параллельной задаче
    control.runInParallel(function () {
        brick.setStatusLightInBackground(StatusLight.Red, 250); // Светим светодиодом, что мы закончили считывание
        while (true) {
            let currTime = control.millis(); // Текущее время
            let color = RgbToHsvlToColorConvert(); // Узнаём цвет переведя RGB в HSVL и получив код цвета
            let averageEnc = ((chassis.leftMotor.angle() - startEncLeftMot) + (chassis.rightMotor.angle() - startEncRightMot)) / 2; // Среднее значение с энкодеров
            if (280 <= averageEnc && averageEnc <= 400) parkElements[5] = color; // Считываем на зоне 6
            else if (averageEnc <= 550) parkElements[4] = color; // Считываем на зоне 5
            else if (averageEnc <= 730) parkElements[3] = color; // Считываем на зоне 4
            else if (averageEnc <= 870) parkElements[2] = color; // Считываем на зоне 3
            else if (averageEnc <= 1000) parkElements[1] = color; // Считываем на зоне 2
            else if (averageEnc <= 1150) parkElements[0] = color; // Считываем на зоне 1
            else if (averageEnc <= 1400) break; // Прервать, если проехал больше
            control.pauseUntilTime(currTime, 10); // Ожидание выполнения цикла
        }
        brick.setStatusLightInBackground(StatusLight.OrangeFlash, 500); // Светим светодиодом, что мы закончили считывание
    });
    motions.LineFollowToDistanceWithLeftSensor(HorizontalLineLocation.Outside, 700, AfterMotion.DecelRolling, { speed: 20, Kp: 0.2, Kd: 1.75 }); pause(50);
    // Вывести на экран найденные элементы
    for(let i = 0; i < 6; i++) {
        brick.printString(`${i + 1}) ${parkElements[i]}`, i + 1, 20);
    }
    // Поворачиваем, чтобы стать на линию
    chassis.PivotTurn(30, 40, WheelPivot.LeftWheel); pause(50);
    chassis.PivotTurn(30, 40, WheelPivot.RightWheel); pause(50);
    // Двигаемся до перекрёстка
    motions.LineFollowToIntersection(AfterMotion.DecelRolling, { speed: 50, Kp: 0.15, Kd: 1.5 }); pause(50);
    // Поворачиваемся к зоне установки кабеля
    chassis.PivotTurn(78, 40, WheelPivot.LeftWheel); pause(50);
    chassis.PivotTurn(79, 40, WheelPivot.RightWheel); pause(50);
    // Двигаемся к зоне электрозярядки B для установки кабеля
    chassis.DistMove(240, 50, true);
    // Поднимаем манипуляторы, чтобы оставить кабель
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Close, 30);
    });
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Close, 30);
    });
    pause(400); // Ждём, чтобы манипуляторы поднялись
    chassis.DistMove(-550, 50, true); pause(50); // Едем назад задним ходом
    chassis.SpinTurn(-90, 30); pause(50); // Поворачиваем к велосипедам, чтобы втолкнуть в зону зарядки A
    chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -40, AfterMotion.BreakStop); // Едем назад до определения чёрной линии
    levelings.LineAlignment(VerticalLineLocation.Front, 1200); // Выравниваемся на линии
    chassis.DistMove(725, 50, true); pause(100); // Едем вперёд, чтобы затолкать велосипеды в зону с зарядкой
    chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -40, AfterMotion.BreakStop); pause(50); // Едем назад до определения чёрной линии
    // Открываем манипуляторы, чтобы отпустить кабель
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 30);
    });
    control.runInParallel(function () {
        SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 30);
    });
    pause(100);
    chassis.DistMove(50, 50, true); pause(50); // Вперёд, чтобы встать колёсами на линию
    chassis.SpinTurn(-90, 40); // Поворачиваем к стороне зоны старта
    motions.LineFollowToDistance(200, AfterMotion.NoStop); // Едем двемя датчиками на дистанцию без команды торможения
    motions.LineFollowToRightIntersection(HorizontalLineLocation.Inside, AfterMotion.DecelRolling, { speed: 40, Kp: 0.2, Kd: 1.5 }); pause(50); // Едем до перекрёстка справа

    // 6 ПАРКОВЫХ ЭЛЕМЕНТОВ
    for (let i = 0; i < 3; i++) {
        if (i == 0) {
            motions.LineFollowToDistance(110, AfterMotion.BreakStop, { speed: 20 }); pause(50); // Подъезжаем по линии на расстояние к первому-второму элементу
        } else if (i == 2) {
            motions.LineFollowToDistance(280, AfterMotion.BreakStop, { speed: 20 }); pause(50); // Подъезжаем по линии на расстояние к третьему-четвёртому элементу
        } else {
            motions.LineFollowToDistance(450, AfterMotion.BreakStop, { speed: 20 }); pause(50); // Подъезжаем по линии на расстояние к пятому-шестому элементу
        }
        chassis.SpinTurn(-90, 30); // Поворачиваемся влево к парковым элементам

        // chassis.DistMove(-20, 30, true); // Назад к линии
        chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -30, AfterMotion.BreakStop); pause(50); // Объезжаем назад к линии
        levelings.LineAlignment(VerticalLineLocation.Behind, 500); // Выравниваемся на линии

        chassis.DistMove(130, 20, true); // Подъехать, чтобы захватить

        control.runInParallel(function () {
            MANIP_MOTOR_LEFT.run(-10, 150, MoveUnit.Degrees); // Взять первый элемент
            if (parkElements[0] == 2 || parkElements[0] == 3) leftClawElement = 2; // Записываем левому манипулятору синий элемент
            else leftClawElement = 1; // Иначе чёрный
        });
        control.runInParallel(function () {
            MANIP_MOTOR_RIGHT.run(-10, 150, MoveUnit.Degrees); // Взять второй элемет
            if (parkElements[1] == 2 || parkElements[1] == 3) rightClawElement = 2; // Записываем правому манипулятору синий элемент
            else rightClawElement = 1; // Иначе чёрный
        });
        pause(900); // Время, чтобы манипуляторы отработали

        chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -30, AfterMotion.BreakStop); pause(50); // Отъезжаем назад к линии
        chassis.DistMove(60, 20, true); pause(50); // Вперёд, чтобы стать колёсами на линию
        chassis.SpinTurn(-90, 40); // Поворачиваем к перекрёстку у парковой зоны B

        // Двигаемся на расстоние двумя датчиками, чтобы не заметить линию налево
        if (i == 0) motions.LineFollowToDistance(200, AfterMotion.NoStop, { speed: 40 });
        else if (i == 2) motions.LineFollowToDistance(400, AfterMotion.NoStop, { speed: 40 });
        else motions.LineFollowToDistance(600, AfterMotion.NoStop, { speed: 40 });

        motions.LineFollowToIntersection(AfterMotion.BreakStop); pause(50); // Двигаемся до перекрёстка у парковой зоны B

        // Если парковая зона B не заполнена 3-я элементами
        if (parkZoneB.length < 3) {
            if (parkZoneB.length == 0) {
                chassis.DistMove(-10, 30, true); pause(50); // Отъезжаем назад, чтобы поставить фигурку в B
            } else {
                chassis.DistMove(-50, 30, true); pause(50); // Отъезжаем назад, чтобы поставить фигурку в B
            }
            chassis.SpinTurn(90, 40); pause(50); // Поворачиваем к парковой зоне B
            chassis.DistMove(120, 30, true); pause(50); // Двигаемся вперёд на парковую зону B
            // Парковая зона B
            // Левый манипулятор
            if (parkZoneB.length < 3 && parkZoneB.indexOf(2) != -1) { // Если в зоне B меньше 3х элементов и нет синей фигуры
                parkZoneB.push(leftClawElement); // Добавляем в массив парковых элементов зоны B какую фигуру поставили
                control.runInParallel(function () { // Ставим фигуру в левом манипуляторе
                    SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 15);
                    leftClawElement = 0; // Манипулятор пуст
                });
            }
            // Правый манипулятор
            if (parkZoneB.length < 3 && parkZoneB.indexOf(2) != -1) { // Если в зоне B меньше 3х элементов и нет синей фигуры
                parkZoneB.push(rightClawElement); // Добавляем в массив парковых элементов зоны B какую фигуру поставили
                control.runInParallel(function () {
                    SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 15);
                    rightClawElement = 0; // Манипулятор пуст
                });
            }
            pause(800); // Время, чтобы манипулятор(ы) отработали

            chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -30, AfterMotion.BreakStop); // Отъезжаем назад к линии
            levelings.LineAlignment(VerticalLineLocation.Behind, 500); // Выравниваемся на линии

            if (leftClawElement != 0 || rightClawElement != 0) { // Если в одном из манипуляторов осталась фигурка
                chassis.DistMove(-470, 40, true); pause(50); // Задним ходом назад
                chassis.SpinTurn(90, 30); pause(50); // Поворот на право
                chassis.DistMove(550, 40, true); pause(50); // Вперёд, чтобы подъехать к парковой зоне А
                chassis.SpinTurn(90, 30); pause(50); // Поворачиваем к парковой зоне А
                chassis.DistMove(80, 40, true); pause(50); // Вперёд в парковую зону A
                if (parkZoneB.length < 3 && leftClawElement != 0) { // Если левый манипулятор не пустой
                    control.runInParallel(function () {
                        SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 15);
                        parkZoneA.push(leftClawElement); // Записываем, что в парковой зоне оставили фигурку
                        leftClawElement = 0; // В левом манипуляторе больше ничего нет
                    });
                }
                if (parkZoneB.length < 3 && rightClawElement != 0) { // Если правый манипулятор не пустой
                    control.runInParallel(function () {
                        SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 15);
                        parkZoneA.push(leftClawElement); // Записываем, что в парковой зоне оставили фигурку
                        rightClawElement = 0; // В правом манипуляторе больше ничего нет
                    });
                }
                pause(900); // Время, чтобы манипуляторы отработали
                chassis.DistMove(-80, 40, true); pause(50); // Отъезжаем назад от парковой зоны А
                chassis.SpinTurn(90, 30); pause(50); // Поворачиваем обратно
                chassis.DistMove(450, 40, true); pause(50); // Едем обратно
                chassis.SpinTurn(90, 30); pause(50); // Поворачиваем к линии
                chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, 40, AfterMotion.BreakStop); pause(50); // Едем обратно на линию
                levelings.LineAlignment(VerticalLineLocation.Behind, 500); // Выравниваемся на линии
            }

            chassis.DistMove(50, 40, true); pause(50); // Становимся на линию колёсами
            chassis.SpinTurn(90, 30); pause(50); // Поворачиваемся влево к парковым элементам
        } else { // Иначе если парковая зона А не полностью заполнена
            chassis.SpinTurn(-90, 40); pause(50); // Поворачиваем к парковой зоне B
            chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, -30, AfterMotion.BreakStop); // Объезжаем назад к линии
            levelings.LineAlignment(VerticalLineLocation.Front, 750); // Выравниваемся на линии
            chassis.DistMove(470, 40, true); pause(50); // Вперёд
            chassis.SpinTurn(-90, 30); pause(50); // Поворот на право
            chassis.DistMove(550, 40, true); pause(50); // Вперёд, чтобы подъехать к парковой зоне A
            chassis.SpinTurn(90, 30); pause(50); // Поворачиваем к парковой зоне A
            chassis.DistMove(80, 40, true); pause(50); // Вперёд в парковую зону A
            // Левый манипулятор
            if (parkZoneA.indexOf(2) != -1) { // Если в зоне A уже есть синия фигура
                control.runInParallel(function () { // Ставим фигуру в левом манипуляторе
                    SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 15);
                    parkZoneA.push(leftClawElement); // Записываем, что в парковой зоне оставили фигурку
                    leftClawElement = 0; // В левом манипуляторе больше ничего нет
                });
            }
            // Правый манипулятор
            if (parkZoneA.indexOf(2) != -1) { // Если в зоне A уже есть синия фигура
                control.runInParallel(function () {
                    SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 15);
                    parkZoneA.push(rightClawElement); // Записываем, что в парковой зоне оставили фигурку
                    rightClawElement = 0; // В правом манипуляторе больше ничего нет
                });
            }
            pause(900); // Время, чтобы манипуляторы отработали
            chassis.DistMove(-80, 40, true); pause(50); // Отъезжаем назад от парковой зоны А
            chassis.SpinTurn(90, 30); pause(50); // Поворачиваем обратно
            chassis.DistMove(450, 40, true); pause(50); // Едем обратно
            chassis.SpinTurn(90, 30); pause(50); // Поворачиваем к линии
            chassis.MoveToRefZone(SensorSelection.LeftOrRight, LogicalOperators.Less, 20, 0, 40, AfterMotion.BreakStop); pause(50); // Едем обратно на линию
            levelings.LineAlignment(VerticalLineLocation.Front, 1000); // Выравниваемся на линии
            chassis.DistMove(50, 40, true); pause(50); // Становимся на линию колёсами
            chassis.SpinTurn(90, 30); pause(50); // Поворачиваемся влево к парковым элементам
        }

        motions.LineFollowToDistance(200, AfterMotion.NoStop); // Едем двемя датчиками на дистанцию без команды торможения
        motions.LineFollowToRightIntersection(HorizontalLineLocation.Inside, AfterMotion.DecelRolling, { speed: 40, Kp: 0.2, Kd: 1.5 }); pause(50); // Едем до перекрёстка справа
    }
    */

    // Вернутся домой
    // motions.LineFollowToDistance(150, AfterMotion.NoStop);
    // motions.LineFollowToRightIntersection(HorizontalLineLocation.Inside, AfterMotion.DecelRolling, { speed: 40, Kp: 0.25, Kd: 1.5 });
    // motions.LineFollowToIntersection(AfterMotion.BreakStop);
    // chassis.DistMove(100, 30, true);
    // chassis.PivotTurn(90, 40, WheelPivot.LeftWheel);

    // chassis.DistMove(-20, 30, true);
    // chassis.PivotTurn(90, 40, WheelPivot.RightWheel);
    // motions.LineFollowToDistance(200, AfterMotion.BreakStop);
    // chassis.SpinTurn(-90, 30);
    // control.runInParallel(function () {
    //     MANIP_MOTOR_LEFT.run(-10, 115, MoveUnit.Degrees); // Взять первый элемент
    // });
    // control.runInParallel(function () {
    //     MANIP_MOTOR_RIGHT.run(-10, 110, MoveUnit.Degrees); // Взять второй элемет
    // });
    // pause(500);
    // chassis.DistMove(100, 30, true);
    // control.runInParallel(function () {
    //     SetManipulatorPosition(MANIP_MOTOR_LEFT, ClawState.Open, 15);
    // });
    // control.runInParallel(function () {
    //     SetManipulatorPosition(MANIP_MOTOR_RIGHT, ClawState.Open, 15);
    // });
    // pause(500);
}

Main(); // Вызов главной функции