import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BOARD)

GPIO.setup(12, GPIO.OUT)
GPIO.setup(11, GPIO.OUT)

p = GPIO.PWM(12, 50)
x = GPIO.PWM(11, 50)

p.start(7.5)
x.start(7.5)

p.ChangeDutyCycle(7.5)  # turn towards 90 degree
x.ChangeDutyCycle(7.5)

time.sleep(2) # sleep 1 second
p.stop()
x.stop()
GPIO.cleanup()
