/*
FOR THE CIRCUIT PLAYGROUND EXPRESS, NO EXTERNAL HARDWARE COMPONENTS REQUIRED
PASTE ONTO A NEW ADAFRUIT MAKECODE PROJECT (makecode.adafruit.com) 
AND "Download" TO THE CIRCUIT PLAYGROUND EXPRESS BY PUTTING IT IN FLASH MODE (using the reset button)
*/

// ALL LOGGING IS FOR DEBUGGING

input.buttonA.onEvent(ButtonEvent.Down, function () {
    if (game.won || game.lost) {
        game.reset();
    }
})

input.buttonB.onEvent(ButtonEvent.Down, function () {
    // Unused event
})

class UART {
    constructor() {
        serial.setBaudRate(BaudRate.BaudRate115200);
    }

    send(data: string) {
        return serial.writeLine(data);
    }
} // UART class is currently unused

class Game {
    /*Typing*/
    round: number;
    maxRounds: number;
    chance: number;
    maxChances: number;
    chase: { lightIndex: number, enabled: boolean, cycles: number };
    target: { lightIndex: number, enabled: boolean };
    cycleMultiplier: number;
    scoredVictory: boolean;
    scoredFailure: boolean;
    failures: number;
    won: boolean;
    lost: boolean;
    uart: UART;
    lightringController: LightRing;

    /*constructor() is the main function that runs to construct the class variables and maybe even more functions*/
    /*
    * Creates a new reactiv8 Game on the Circuit Playground Express.
    */
    constructor() {
        this.round = 0;
        this.maxRounds = 10;
        this.chance = 0;
        this.maxChances = 3;
        this.chase = {
            lightIndex: 0,
            enabled: true,
            cycles: 0
        };
        this.target = {
            lightIndex: 0,
            enabled: true
        };
        this.scoredVictory = false; // boolean to keep track of victory
        this.scoredFailure = false; // boolean to keep track of failure
        this.won = false;
        this.lost = false;
        this.failures = 0; // number to keep track of losses per round
        this.cycleMultiplier = 0.2;

        this.uart = null;
        this.lightringController = new LightRing();
    }

    /*
    * Initializes the game, suiting it for a start.
    */
    init() {
        this.uart = new UART();
        this.uart.send("FIRSTINIT");

        music.playTone(Note.G, 200);

        let lights = this.lightringController.formalities;

        for (let i of lights) {
            i.setLightBrightness(5);
        }

        if (this.target.enabled) {
            this.target.lightIndex = Math.randomRange(0, 9);
            lights[this.target.lightIndex].setLightColor(light.rgb(0, 255, 0));
        }
    }

    /*
    * Main loop function.
    */
    loop() {
        let lights = this.lightringController.formalities;
        let soundLevelPercentage = (input.soundLevel() / 255) * 100;

        if (this.chase.enabled && (!this.scoredVictory && !this.scoredFailure) && (!this.won && !this.lost)) {
            this.chase.cycles += 1 * this.cycleMultiplier;
          
            console.log(this.chase.lightIndex);
            console.log(this.chase.cycles);
          
            let lastLightIndex = this.chase.lightIndex;
          
            if (this.chase.cycles >= 2) {
                if (this.chase.lightIndex < 9) {
                    this.chase.lightIndex = this.chase.lightIndex + 1;
                    this.chase.cycles = 0;
                } else {
                    this.chase.lightIndex = 0;
                    this.chase.cycles = 0;
                }
            }

            if (soundLevelPercentage > 65) {
                if (lastLightIndex == this.target.lightIndex) {
                    this.scoredVictory = true;
                    music.baDing.play();
                    lights[this.target.lightIndex].setLightColor(light.rgb(255, 255, 0));
                  
                    pause(2000);
                  
                    for (let i of lights) {
                        i.setLightBrightness(0);
                        i.setLightColor(color.rgb(0, 0, 0));
                    }
                  
                    if (this.nextRound() == "SIGNAL_GAME_REFLECTION") {
                        for (let i of lights) {
                            i.setLightBrightness(10);
                            i.setLightColor(color.rgb(0, 255, 0));
                            pause(50);
                        }
                        music.jumpUp.play();
                        this.won = true;
                        this.lost = false;
                        this.failures = 0;
                    } else {
                        if (this.target.enabled) {
                            this.target.lightIndex = Math.randomRange(0, 9);
                            lights[this.target.lightIndex].setLightColor(light.rgb(0, 255, 0));
                        }
                        this.scoredVictory = false;
                        this.failures = 0;
                    }
                } else {
                    this.failures += 1;
                    music.powerDown.play();
                    this.scoredFailure = true;
                  
                    pause(1000); // uses a debounce to alert the user to stop making noise before it starts again, pauses for 1 second approximately
                  
                    lights[lastLightIndex].setLightColor(color.rgb(0, 0, 0));
                    this.scoredFailure = false;
                }
              
                if (this.failures >= this.maxChances) {
                    music.jumpDown.play();
                    this.scoredFailure = true;
                  
                    pause(1000);
                  
                    this.won = false;
                    this.lost = true;
                    this.failures = 0;
                  
                    let seq = [Note.C, Note.B, Note.A, Note.G, Note.F, Note.E, Note.D, Note.C, Note.D, Note.E];
                    let seqIndex = 0;
                  
                    for (let i of lights) {
                        i.setLightBrightness(10);
                        i.setLightColor(color.rgb(255, 0, 0));
                      
                        pause(400);
                      
                        music.playTone(seq[seqIndex], 300);
                        seqIndex += 1;
                    }
                }
            } else {
                for (let i of lights) {
                    if (i.id == this.target.lightIndex) {
                        //pass it, continue to next iteration
                        continue;
                    } else if (i.id == lastLightIndex && this.chase.cycles == 0) {
                        i.setLightBrightness(0);
                        i.setLightColor(color.rgb(0, 0, 0));
                    }
                }

                lights[this.target.lightIndex].setLightColor(light.rgb(0, 255, 0));
                lights[this.chase.lightIndex].setLightColor(light.rgb(255, 0, 0));
                lights[this.chase.lightIndex].setLightBrightness(5);
            }
        }
    }

    /*
    * Switches to the next round and increases the multiplier to make the game faster.
    */
    nextRound() {
        if (this.round == this.maxRounds) return "SIGNAL_GAME_REFLECTION";
        this.round += 1;
        this.cycleMultiplier += 0.1;
        return "SIGNAL_SWITCH_SUCCESSFUL";
    }

    /*
    * Resets the game, starting it again from a clean slate.
    */
    reset() {
        this.round = 0;
        this.maxRounds = 10;
        this.chance = 0;
        this.maxChances = 3;
        this.chase = {
            lightIndex: 0,
            enabled: true,
            cycles: 0
        };
        this.target = {
            lightIndex: 0,
            enabled: true
        };
        this.scoredVictory = false; // boolean to keep track of victory
        this.scoredFailure = false; // boolean to keep track of failure
        this.won = false;
        this.lost = false;
        this.failures = 0; // number to keep track of losses per round
        this.cycleMultiplier = 0.2;

        let lights = this.lightringController.formalities;

        for (let i of lights) {
            i.setLightBrightness(0);
            i.setLightColor(color.rgb(0, 0, 0));
        }

        console.log("Reset game successfully");
    }
}

class Light {
    id: number;

    /*
    * A light class assigned to an ID to make it organized and for pixel changes to be easily accessible.
    */
    constructor(id: number) {
        this.id = id;
        light.pixels.setPixelBrightness(this.id, 255);
    }

    /*
    * Sets the light colour on the NeoPixel.
    */
    setLightColor(value: number) {
        light.setPixelColor(this.id, value);
    }

    /*
    * Gets the light colour from the NeoPixel.
    */
    getLightColor() {
        return light.pixelColor(this.id);
    }

    /*
    * Sets the light brightness on the NeoPixel.
    */
    setLightBrightness(value: number) {
        light.pixels.setPixelBrightness(this.id, value);
    }
}

class LightRing {
    formalities: Array<Light>;

    /*
    * A light ring class to organize the Light objects in an array or list.
    */
    constructor() {
        this.formalities = [];

        for (let i = 0; i < (10); i++) {
            this.formalities.push(new Light(i));
        }

        this.formalities.forEach((a: Light) => console.log(a.getLightColor())); // debugging (once more) should display 0 in the console.
    }
}

let game: Game = new Game();
game.init();

forever(function () {
    game.loop()
})
