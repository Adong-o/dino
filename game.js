class DinoGame {
    constructor() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Enhanced game settings
        this.settings = {
            gameSpeed: 0.2,
            maxSpeed: 0.5,
            speedIncrement: 0.00005,
            jumpForce: 0.4,
            gravity: 0.015,
            groundLevel: 0,
            cameraHeight: 5,
            cameraDistance: 10,
            worldDepth: 1000,
            roadWidth: 10,
            dayNightCycle: 10000,
            obstacleInterval: 2000,
            numClouds: 20,
            numTrees: 50,
            numMountains: 5,
            worldWidth: 200,
            initialObstacleDistance: 50,
            distanceMultiplier: 0.1
        };

        // Game state
        this.state = {
            score: 0,
            distance: 0,
            highScore: parseInt(localStorage.getItem('highScore')) || 0,
            highDistance: parseInt(localStorage.getItem('highDistance')) || 0,
            obstaclesPassed: 0,
            isPlaying: false,
            isGameOver: false,
            isDucking: false,
            isJumping: false,
            jumpCount: 0,
            lastObstacleTime: 0,
            lastDistanceUpdate: 0,
            dayTime: true
        };

        // Initialize game components
        this.initializeLoaders();
        this.setupLighting();
        this.createEnvironment();
        this.createDino();
        this.createClouds();
        this.createTrees();
        this.createMountains();
        this.setupOrbitControls();
        this.setupEventListeners();
        this.hideLoadingScreen();

        // Load high scores from server
        this.loadHighScores();

        // Start animation loop
        this.animate();
    }

    initializeLoaders() {
        // Setup GLTF loader with DRACO compression
        this.gltfLoader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this.gltfLoader.setDRACOLoader(dracoLoader);
    }

    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(100, 100, 0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 4096;
        this.sunLight.shadow.mapSize.height = 4096;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.sunLight);

        // Hemisphere light for better ambient lighting
        this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x404040, 0.6);
        this.scene.add(this.hemisphereLight);
    }

    createEnvironment() {
        // Ground with better texture
        const groundTexture = this.createGroundTexture();
        const groundGeometry = new THREE.PlaneGeometry(this.settings.worldWidth, this.settings.worldDepth);
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: groundTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = this.settings.groundLevel;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Road with better texture
        const roadGeometry = new THREE.PlaneGeometry(this.settings.roadWidth, this.settings.worldDepth);
        const roadTexture = this.createRoadTexture();
        const roadMaterial = new THREE.MeshStandardMaterial({
            map: roadTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        this.road = new THREE.Mesh(roadGeometry, roadMaterial);
        this.road.rotation.x = -Math.PI / 2;
        this.road.position.y = this.settings.groundLevel + 0.01;
        this.road.receiveShadow = true;
        this.scene.add(this.road);

        // Enhanced sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);

        // Add fog with greater distance
        this.scene.fog = new THREE.Fog(0xe0e0e0, 20, 150);

        // Setup camera with better initial position
        this.camera.position.set(5, this.settings.cameraHeight, this.settings.cameraDistance);
        this.camera.lookAt(0, 0, -10);
    }

    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Road background
        ctx.fillStyle = '#404040';
        ctx.fillRect(0, 0, 512, 512);

        // Road lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.setLineDash([30, 40]);
        ctx.beginPath();
        ctx.moveTo(256, 0);
        ctx.lineTo(256, 512);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 50);
        return texture;
    }

    createGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base color
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, 0, 512, 512);

        // Add texture variation
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = `rgba(139, 115, 85, ${Math.random() * 0.4})`;
            ctx.fillRect(
                Math.random() * 512,
                Math.random() * 512,
                Math.random() * 4,
                Math.random() * 4
            );
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 100);
        return texture;
    }

    createDino() {
        // Create dino group
        this.dino = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x535353 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        this.dino.add(body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 1);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.8, 0.2);
        head.castShadow = true;
        this.dino.add(head);

        // Eyes
        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 1.9, 0.6);
        this.dino.add(leftEye);

        // Enhanced legs with better proportions and ground contact
        const legGeometry = new THREE.BoxGeometry(0.2, 1.2, 0.2);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x434343 });
        
        // Front legs
        this.leftFrontLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftFrontLeg.position.set(0.3, 0.6, 0.3);
        this.leftFrontLeg.castShadow = true;
        this.dino.add(this.leftFrontLeg);

        this.rightFrontLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightFrontLeg.position.set(-0.3, 0.6, 0.3);
        this.rightFrontLeg.castShadow = true;
        this.dino.add(this.rightFrontLeg);

        // Back legs
        this.leftBackLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftBackLeg.position.set(0.3, 0.6, -0.3);
        this.leftBackLeg.castShadow = true;
        this.dino.add(this.leftBackLeg);

        this.rightBackLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightBackLeg.position.set(-0.3, 0.6, -0.3);
        this.rightBackLeg.castShadow = true;
        this.dino.add(this.rightBackLeg);

        // Set initial position with legs touching ground
        this.dino.position.y = this.settings.groundLevel + 0.6;
        this.scene.add(this.dino);
    }

    setupOrbitControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.target.set(0, 2, -5);
        this.controls.update();
    }

    createClouds() {
        this.clouds = [];
        const cloudGeometries = [
            new THREE.SphereGeometry(2, 8, 8),
            new THREE.SphereGeometry(3, 8, 8),
            new THREE.SphereGeometry(2.5, 8, 8)
        ];
        
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            opacity: 0.8,
            transparent: true,
            flatShading: true
        });

        for (let i = 0; i < this.settings.numClouds; i++) {
            const cloudGroup = new THREE.Group();
            const numParts = 3 + Math.floor(Math.random() * 3);
            
            for (let j = 0; j < numParts; j++) {
                const geometry = cloudGeometries[Math.floor(Math.random() * cloudGeometries.length)];
                const cloud = new THREE.Mesh(geometry, cloudMaterial);
                cloud.position.set(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 3
                );
                cloud.scale.setScalar(0.5 + Math.random() * 0.5);
                cloudGroup.add(cloud);
            }

            cloudGroup.position.set(
                (Math.random() - 0.5) * this.settings.worldWidth,
                30 + Math.random() * 20,
                (Math.random() - 0.5) * this.settings.worldDepth
            );
            
            this.clouds.push(cloudGroup);
            this.scene.add(cloudGroup);
        }
    }

    createTrees() {
        this.trees = [];
        const treeColors = [0x2d5a27, 0x1e4422, 0x3b7a33];
        
        for (let i = 0; i < this.settings.numTrees; i++) {
            const treeGroup = new THREE.Group();
            
            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
            const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a3219 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            // Tree top (multiple layers for fuller look)
            const treeColor = treeColors[Math.floor(Math.random() * treeColors.length)];
            const leafMaterial = new THREE.MeshPhongMaterial({ color: treeColor });
            
            for (let j = 0; j < 3; j++) {
                const topGeometry = new THREE.ConeGeometry(1.5 - j * 0.3, 2, 8);
                const top = new THREE.Mesh(topGeometry, leafMaterial);
                top.position.y = 2 + j * 1.2;
                top.castShadow = true;
                treeGroup.add(top);
            }
            
            // Position trees away from the road
            const side = Math.random() > 0.5 ? 1 : -1;
            treeGroup.position.set(
                side * (this.settings.roadWidth/2 + 5 + Math.random() * 20),
                this.settings.groundLevel,
                (Math.random() - 0.5) * this.settings.worldDepth
            );
            
            this.trees.push(treeGroup);
            this.scene.add(treeGroup);
        }
    }

    createMountains() {
        this.mountains = [];
        const mountainMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            flatShading: true
        });

        for (let i = 0; i < this.settings.numMountains; i++) {
            const mountainGeometry = new THREE.ConeGeometry(
                20 + Math.random() * 30,
                40 + Math.random() * 60,
                8
            );
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            
            // Position mountains in the far background
            const side = Math.random() > 0.5 ? 1 : -1;
            mountain.position.set(
                side * (50 + Math.random() * 50),
                this.settings.groundLevel,
                -this.settings.worldDepth/2 + Math.random() * 200
            );
            
            this.mountains.push(mountain);
            this.scene.add(mountain);
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        document.getElementById('restart-button').addEventListener('click', () => this.startGame());
    }

    handleKeyDown(event) {
        if ((event.code === 'Space' || event.code === 'ArrowUp') && !event.repeat) {
            event.preventDefault();
            if (!this.state.isPlaying) {
                this.startGame();
            } else if (!this.state.isGameOver) {
                this.jump();
            }
        } else if (event.code === 'ArrowDown') {
            event.preventDefault();
            if (!this.state.isGameOver && this.state.isPlaying) {
                this.duck(true);
            }
        }
    }

    handleKeyUp(event) {
        if (event.code === 'ArrowDown') {
            this.duck(false);
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    startGame() {
        this.state.score = 0;
        this.state.distance = 0;
        this.state.obstaclesPassed = 0;
        this.state.isPlaying = true;
        this.state.isGameOver = false;
        this.settings.gameSpeed = 0.2;
        this.state.lastObstacleTime = Date.now();
        this.state.lastDistanceUpdate = Date.now();
        
        document.getElementById('score-value').textContent = '0';
        document.getElementById('distance-value').textContent = '0';
        document.getElementById('game-over').style.display = 'none';
        
        // Clear existing obstacles
        this.obstacles?.forEach(obstacle => this.scene.remove(obstacle));
        this.obstacles = [];
    }

    jump() {
        if (!this.state.isJumping || (this.state.jumpCount < 2 && this.dino.position.y < 4)) {
            this.state.isJumping = true;
            this.state.jumpCount++;
            this.dino.userData.jumpVelocity = this.settings.jumpForce;
        }
    }

    duck(isDucking) {
        this.state.isDucking = isDucking;
        if (isDucking) {
            this.dino.scale.y = 0.5;
            this.dino.position.y = this.settings.groundLevel + 0.4;
        } else {
            this.dino.scale.y = 1;
            this.dino.position.y = this.settings.groundLevel + 0.8;
        }
    }

    updateDino() {
        if (this.state.isJumping) {
            this.dino.position.y += this.dino.userData.jumpVelocity;
            this.dino.userData.jumpVelocity -= this.settings.gravity;

            if (this.dino.position.y <= this.settings.groundLevel + 0.8) {
                this.dino.position.y = this.settings.groundLevel + 0.8;
                this.state.isJumping = false;
                this.state.jumpCount = 0;
                this.dino.userData.jumpVelocity = 0;
            }
        }

        // Enhanced running animation with all four legs
        if (!this.state.isJumping && !this.state.isDucking) {
            const time = Date.now() * 0.015;
            // Front legs
            this.leftFrontLeg.rotation.x = Math.sin(time) * 0.8;
            this.rightFrontLeg.rotation.x = Math.sin(time + Math.PI) * 0.8;
            // Back legs
            this.leftBackLeg.rotation.x = Math.sin(time + Math.PI/2) * 0.8;
            this.rightBackLeg.rotation.x = Math.sin(time + Math.PI*1.5) * 0.8;
            // Subtle body movement
            this.dino.position.y = this.settings.groundLevel + 0.8 + Math.sin(time * 2) * 0.05;
            // Add slight head movement
            this.dino.children[1].rotation.y = Math.sin(time * 3) * 0.1;
        }
    }

    createObstacle() {
        const obstacleTypes = [
            {
                type: 'cactus',
                geometry: new THREE.BoxGeometry(0.5, 2, 0.5),
                material: new THREE.MeshPhongMaterial({ color: 0x2d5a27 }),
                position: { y: 1 }
            },
            {
                type: 'rock',
                geometry: new THREE.SphereGeometry(0.8, 8, 8),
                material: new THREE.MeshPhongMaterial({ color: 0x808080 }),
                position: { y: 0.8 }
            },
            {
                type: 'tree',
                geometry: new THREE.CylinderGeometry(0.3, 0.3, 2, 8),
                material: new THREE.MeshPhongMaterial({ color: 0x4a3219 }),
                position: { y: 1 }
            },
            {
                type: 'bush',
                geometry: new THREE.SphereGeometry(1, 8, 8),
                material: new THREE.MeshPhongMaterial({ color: 0x2d5a27 }),
                position: { y: 1 }
            }
        ];

        const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obstacle = new THREE.Mesh(obstacleType.geometry, obstacleType.material);
        
        obstacle.position.set(
            0,
            this.settings.groundLevel + obstacleType.position.y,
            -this.settings.initialObstacleDistance
        );
        
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        obstacle.userData.type = obstacleType.type;
        
        this.obstacles.push(obstacle);
        this.scene.add(obstacle);
    }

    updateObstacles() {
        const currentTime = Date.now();

        // Update existing obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.position.z += this.settings.gameSpeed;

            if (obstacle.position.z > 20) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
                this.state.obstaclesPassed++;
                this.state.score = this.state.obstaclesPassed;
                document.getElementById('score-value').textContent = this.state.score;
            }

            if (!this.state.isGameOver && this.checkCollision(obstacle)) {
                this.gameOver();
            }
        }

        // Create new obstacles at fixed interval
        if (currentTime - this.state.lastObstacleTime > this.settings.obstacleInterval) {
            this.createObstacle();
            this.state.lastObstacleTime = currentTime;
        }
    }

    checkCollision(obstacle) {
        const dinoBox = new THREE.Box3().setFromObject(this.dino);
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        return dinoBox.intersectsBox(obstacleBox);
    }

    updateScore() {
        const currentTime = Date.now();
        if (currentTime - this.state.lastDistanceUpdate > this.settings.distanceMultiplier * 1000) {
            this.state.distance++;
            document.getElementById('distance-value').textContent = this.state.distance;
            this.state.lastDistanceUpdate = currentTime;
            
            // Update game speed
            this.settings.gameSpeed = Math.min(
                this.settings.maxSpeed,
                this.settings.gameSpeed + this.settings.speedIncrement
            );
        }
    }

    gameOver() {
        this.state.isGameOver = true;
        if (this.state.score > this.state.highScore) {
            this.state.highScore = this.state.score;
            this.saveHighScores();
            document.getElementById('high-score-value').textContent = this.state.highScore;
        }
        if (this.state.distance > this.state.highDistance) {
            this.state.highDistance = this.state.distance;
            this.saveHighScores();
            document.getElementById('high-distance-value').textContent = this.state.highDistance;
        }
        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('final-distance').textContent = this.state.distance;
        document.getElementById('game-over').style.display = 'block';
    }

    hideLoadingScreen() {
        document.querySelector('.loading-screen').style.display = 'none';
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.state.isPlaying && !this.state.isGameOver) {
            this.updateDino();
            this.updateObstacles();
            this.updateEnvironment();
            
            // Move ground and road
            this.ground.position.z = (this.ground.position.z + this.settings.gameSpeed) % 20;
            this.road.position.z = (this.road.position.z + this.settings.gameSpeed) % 20;
        }

        // Update controls
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
    }

    updateEnvironment() {
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.position.z += this.settings.gameSpeed * 0.3;
            if (cloud.position.z > this.settings.cameraDistance + 50) {
                cloud.position.z = -this.settings.worldDepth/2;
                cloud.position.x = (Math.random() - 0.5) * this.settings.worldWidth;
                cloud.position.y = 30 + Math.random() * 20;
            }
        });

        // Update trees
        this.trees.forEach(tree => {
            tree.position.z += this.settings.gameSpeed;
            if (tree.position.z > this.settings.cameraDistance + 20) {
                const side = Math.random() > 0.5 ? 1 : -1;
                tree.position.z = -this.settings.worldDepth/2;
                tree.position.x = side * (this.settings.roadWidth/2 + 5 + Math.random() * 20);
            }
        });
    }

    async loadHighScores() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ip = data.ip;
            
            // Here you would typically fetch high scores from your server using the IP
            // For now, we'll use localStorage but you can replace this with actual server calls
            const storedHighScore = localStorage.getItem(`highScore_${ip}`);
            const storedHighDistance = localStorage.getItem(`highDistance_${ip}`);
            
            if (storedHighScore) this.state.highScore = parseInt(storedHighScore);
            if (storedHighDistance) this.state.highDistance = parseInt(storedHighDistance);
            
            document.getElementById('high-score-value').textContent = this.state.highScore;
            document.getElementById('high-distance-value').textContent = this.state.highDistance;
        } catch (error) {
            console.log('Error loading high scores:', error);
        }
    }

    async saveHighScores() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ip = data.ip;
            
            // Here you would typically save high scores to your server using the IP
            // For now, we'll use localStorage but you can replace this with actual server calls
            localStorage.setItem(`highScore_${ip}`, this.state.highScore);
            localStorage.setItem(`highDistance_${ip}`, this.state.highDistance);
        } catch (error) {
            console.log('Error saving high scores:', error);
        }
    }
}

// Initialize game when the page loads
window.addEventListener('load', () => {
    new DinoGame();
}); 