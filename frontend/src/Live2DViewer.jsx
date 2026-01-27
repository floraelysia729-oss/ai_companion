import { useEffect } from 'react';
import * as live2d from 'live2d-render';

const Live2DViewer = () => {
    useEffect(() => {
        let intervalId;

        const init = async () => {
            try {
                await live2d.initializeLive2D({
                    BackgroundRGBA: [0.0, 0.0, 0.0, 0.0],
                    ResourcesPath: "/models/LSS/LSS.model3.json",
                    CanvasSize: {
                        height: 1800,
                        width: 1200,
                    },
                    ShowToolBox: true,
                    LoadFromCache: true,
                    CanvasId: "live2d-canvas",
                });
                console.log("Live2D initialized");

                const playLoop = () => {
                    live2d.setExpression('Normal');
                    console.log("Expression set to Normal");

                    setTimeout(() => {
                        live2d.setExpression('Happy');
                        console.log("Expression set to Happy");
                    }, 2000);
                };

                playLoop();
                intervalId = setInterval(playLoop, 4000);
            } catch (error) {
                console.error("Failed to initialize Live2D:", error);
            }
        };

        init();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return (
        null
    );
};

export default Live2DViewer;
