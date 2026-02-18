import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class AIModelService {
    private model: cocoSsd.ObjectDetection | null = null;
    private loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;

    async loadModel(): Promise<cocoSsd.ObjectDetection> {
        if (this.model) return this.model;

        if (!this.loadingPromise) {
            this.loadingPromise = (async () => {
                try {
                    await tf.setBackend('webgl');
                    await tf.ready();
                    console.log('TensorFlow Backend:', tf.getBackend());

                    this.model = await cocoSsd.load({ base: 'mobilenet_v2' });
                    console.log('COCO-SSD Model Loaded');
                    return this.model;
                } catch (err) {
                    console.error('Failed to load model', err);
                    throw err;
                }
            })();
        }

        return this.loadingPromise;
    }

    getModel(): cocoSsd.ObjectDetection | null {
        return this.model;
    }
}

export const aiService = new AIModelService();
