let canvas = $('#svgCanvas');

function main() {
    let controller = new Controller();
    let pointCounter = 0;

    for (var i = 0; i < 750; i++)
        controller.triangulate(generateRandomPoint());
    //controller.removeSuper();

    canvas.mousemove(e => {
        let newPoint = new vPoint(e.clientX, e.clientY, 10, 'point')
        controller.triangulate(newPoint);
        pointCounter++;

        if (e.detail == 2) {
            controller.removeSuper();
        }
    })
}

class Controller {
    constructor() {
        this.points = [];
        this.triangles = [];
        this.edges = [];
        this.initSuperTriangle();
    }

    pushPoint(pnt) {
        this.points.push(pnt);
    }

    initSuperTriangle() {
        this.superPoints = [];
        let d = 10000;

        let p0 = new vPoint(canvas.width() / 2, -d, 0);
        let p1 = new vPoint(-d, canvas.height(), 0);
        let p2 = new vPoint(canvas.width() + d, canvas.height(), 0);
        this.superPoints.push(p0, p1, p2);

        let e0 = new Edge(p0, p1);
        let e1 = new Edge(p1, p2);
        let e2 = new Edge(p2, p0);

        this.superTriangle = new Triangle(e0, e1, e2);
        this.triangles.push(this.superTriangle);
    }

    triangulate(point) {
        this.points.push(point);
        let triangleBuffer = [];
        for (var i = 0; i < len(this.triangles); i++) {
            if (this.triangles[i]) {
                if (this.triangles[i].contains(point)) {
                    triangleBuffer.push(this.triangles[i]);
                    this.triangles[i].remove();
                    this.triangles[i] = null;
                }
            }
        }

        let edgeBuffer = getOutsideEdges(triangleBuffer);
        for (var i = 0; i < len(edgeBuffer); i++) {
            let e0 = new Edge(edgeBuffer[i].p0, edgeBuffer[i].p1)
            let e1 = new Edge(point, e0.p0);
            let e2 = new Edge(point, e0.p1);
            this.triangles.push(new Triangle(e0, e1, e2));
        }

        this.triangles = this.triangles.filter((obj) => obj); // clean up null triangles
    }

    removeSuper() {
        let toDelete = [];
        for (var i = 0; i < len(this.triangles); i++) {
            let found = false;
            for (var j = 0; j < len(this.triangles[i].edges); j++) {
                let edgePoints = this.triangles[i].edges[j].points;
                for (var k = 0; k < len(edgePoints); k++) {
                    for (var l = 0; l < len(this.superPoints); l++) {
                        if (this.superPoints[l].point.x == edgePoints[k].x && this.superPoints[l].point.y == edgePoints[k].y) {
                            toDelete.push(i);
                            found = true;
                            break;
                        }
                        if (found) break;
                    }
                    if (found) break;
                }
                if (found) break;
            }
        }
        toDelete.forEach(i => {
            this.triangles[i].remove();
            this.triangles[i] = null;
        });
        //this.superPoints.forEach(point => {
        //    point.remove();
        //});
    }
}

function getOutsideEdges(triangles) {
    let duplicates = [];
    let localEdges = [];
    triangles.forEach(triangle => {
        localEdges.push(triangle.edges);
    });
    localEdges = localEdges.flat();
    for (var i = 0; i < len(localEdges); i++) {
        let edgeA = localEdges[i];
        for (var j = 0; j < len(localEdges); j++) {
            let edgeB = localEdges[j];
            if (edgeA.id == edgeB.id) continue;
            if (edgeA.slope == edgeB.slope) {
                if ((edgeA.p0 == edgeB.p0 || edgeA.p0 == edgeB.p1) && (edgeA.p1 == edgeB.p0 || edgeA.p1 == edgeB.p1))
                    duplicates.push(i); // found a duplicate
            }
        }
    }
    for (var i = len(duplicates) - 1; i >= 0; i--)
        localEdges.splice(duplicates[i], 1); // remove dupliactes from localEdges array

    return localEdges;
}

function len(array) {
    return array.length;
}

class Triangle {
    constructor(e0, e1, e2) {
        this.e0 = e0;
        this.e1 = e1;
        this.e2 = e2;

        this.p0 = this.e0.p0;
        this.p1 = this.e0.p1;
        this.p2 = this.e1.p0;

        this.c = new CircumCircle(this.p0, this.p1, this.p2);
    }

    contains(point) {
        let pointDist = (point.x - this.c.x) * (point.x - this.c.x) + (point.y - this.c.y) * (point.y - this.c.y);
        let r = this.c.r * this.c.r;
        return (pointDist < r)
    }

    // remove line svg element from DOM
    remove() {
        this.e0.remove();
        this.e1.remove();
        this.e2.remove();
        this.c.shape.remove();
    }

    get edges() {
        return [this.e0, this.e1, this.e2];
    }
}

class CircumCircle {
    constructor(a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
        var A = b.x - a.x,
            B = b.y - a.y,
            C = c.x - a.x,
            D = c.y - a.y,
            E = A * (a.x + b.x) + B * (a.y + b.y),
            F = C * (a.x + c.x) + D * (a.y + c.y),
            G = 2 * (A * (c.y - b.y) - B * (c.x - b.x)),
            minx, miny, dx, dy;
        /* If the points of the triangle are collinear, then just find the
         * extremes and use the midpoint as the center of the circumcircle. */
        if (Math.abs(G) < 0.000001) {
            minx = Math.min(a.x, b.x, c.x);
            miny = Math.min(a.y, b.y, c.y);
            dx = (Math.max(a.x, b.x, c.x) - minx) * 0.5;
            dy = (Math.max(a.y, b.y, c.y) - miny) * 0.5;
            this.x = minx + dx;
            this.y = miny + dy;
            this.r = dx * dx + dy * dy;
        } else {
            this.x = (D * E - B * F) / G;
            this.y = (A * F - C * E) / G;
            dx = this.x - a.x;
            dy = this.y - a.y;
            this.r = Math.sqrt(dx * dx + dy * dy);
        }
        return new vPoint(this.x, this.y, this.r, 'cc');
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Circle {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.r = r;
    }
}

class Edge {
    p0 = null;
    p1 = null;

    constructor(p0, p1, className) {
        this.p0 = p0;
        this.p1 = p1;
        this.id = hashId();
        this.shape = $(document.createElementNS('http://www.w3.org/2000/svg', 'line')).attr({
            class: className ? className : 'line',
            id: this.id,
            x1: this.p0.x,
            y1: this.p0.y,
            x2: this.p1.x,
            y2: this.p1.y
        });
        this.draw();
    }

    draw() {
        this.shape.appendTo(canvas);
    }

    get slope() {
        if (this.p0.x == this.p1.x)
            return null;

        return (this.p0.y - this.p1.y) / (this.p0.x - this.p1.x);
    }

    get points() {
        return [this.p0.point, this.p1.point];
    }

    remove() {
        this.shape.remove();
    }
}

class vPoint {
    constructor(x, y, r, className) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.point = new Point(x, y);
        this.id = hashId();

        this.shape = $(document.createElementNS('http://www.w3.org/2000/svg', 'circle')).attr({
            class: className ? className : 'point',
            id: this.id,
            cx: this.x,
            cy: this.y,
            r: this.r
        });

        if (className == 'cc')
            this.draw();
    }

    draw() {
        this.shape.appendTo(canvas);
    }

    remove() {
        this.shape.remove();
        this.point = null;
    }
}

function generateRandomPoint() {
    let x = Math.floor(Math.random() * canvas.width());
    let y = Math.floor(Math.random() * canvas.height());
    return new vPoint(x, y, 10);
}

function hashId() {
    return 'xxxx-xxxx-xxxx-xxxx-xxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

main();