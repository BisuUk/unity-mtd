#pragma strict

var target : GameObject;
var isActive : boolean;
var origRotation : Quaternion;
var range : float = Tower.baseRange;
var fov : float = Tower.baseFOV;
var lineRenderer : LineRenderer;
var player : PlayerData;

static var fireRate : float = 0.25;

private var barrelLeft : Transform;
private var barrelRight : Transform;
private var nextFireTime : float;
private var fireLeftBarrel  : boolean = false;

private var laserPulse : Transform;



function Start()
{
   laserPulse = Resources.Load("TowerPulseLaserPrefab", Transform);

   lineRenderer = GetComponent(LineRenderer);
   lineRenderer.material = new Material(Shader.Find("Particles/Additive"));
   for (var child : Transform in transform)
   {
      if (child.name == "BarrelLeft")
         barrelLeft = child;
      else if (child.name == "BarrelRight")
         barrelRight = child;
   }
}

//InvokeRepeating("LaunchProjectile", 2, 0.3);

function SetRange(newRange : float)
{
   range = newRange;
   if (range < Tower.baseRange)
      range = Tower.baseRange;
}

// Find the the closest unit
function FindClosestUnit() : GameObject
{
    // Find all game objects with tag Enemy
    var gos : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
    var closest : GameObject; 
    var distance = Mathf.Infinity; 
    var position = transform.position; 
    // Iterate through them and find the closest one
    for (var go : GameObject in gos)
    {
        var diff = (go.transform.position - position);
        var curDistance = diff.sqrMagnitude; 
        if (curDistance < distance)
        {
            closest = go; 
            distance = curDistance; 
        }
    }
    return closest;    
}

function FindTarget()
{
   var closest : GameObject = null;
   var distance = Mathf.Infinity;
   var position = transform.position;

   // Find all game objects with tag
   var gos : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

   // Iterate through them and find the closest one
   for (var go : GameObject in gos)
   {
      var diff = (go.transform.position - position);
      // Check object is in range...
      if (diff.magnitude < range)
      {
         // Check if object is in FOV...
         var angle : float = Quaternion.Angle(Quaternion.LookRotation(diff), origRotation);
         if (Mathf.Abs(angle) <= fov/2.0)
            closest = go;
      }
   }
   return closest;
}

function Fire()
{

}

function Update()
{
   var targ : GameObject = FindTarget();
   if (targ)
   {
      transform.LookAt(targ.transform);
      target = targ;

      // On emitrate interval
      if( Time.time > nextFireTime )
      {
         var barrel : Transform = (fireLeftBarrel) ? barrelLeft : barrelRight;

         var pulse : Transform = Instantiate(laserPulse, transform.position, Quaternion.identity);
         var tpl : TowerPulseLaser = pulse.gameObject.AddComponent(TowerPulseLaser);
         tpl.target = target.transform;


         // recoil
         //barrel.Translate(Vector3(0,-1,0), Space.Self);
         //barrel.Translate(Vector3(0,-1,0), Space.Self)

         nextFireTime  = Time.time + fireRate;
         fireLeftBarrel = !fireLeftBarrel;

         // Do damage here
      }
   }
   else
   {
      //barrelRightLR.enabled = false;
      //barrelLeftLR.enabled = false;

   }

   if (player.selectedTower == gameObject)
      DrawFOV();
   else
      lineRenderer.enabled = false;
}


function OnMouseDown()
{
   player.selectedTower = gameObject;
}

function DrawFOV()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetColors(renderer.material.color,renderer.material.color);
   lineRenderer.SetVertexCount(fov/stride+3);

   lineRenderer.SetPosition(0, transform.position);
   indexCounter = 1;
   for (i=-fov/2.0; i<=fov/2.0; i+=stride)
   {
      r = origRotation;
      r *= Quaternion.Euler(0, i, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
   lineRenderer.SetPosition(indexCounter, transform.position);
}


function DrawRange()
{
   var stride : float = 10.0;
   var indexCounter : int = 1;
   var i : float = 0;
   var r : Quaternion;

   lineRenderer.enabled = true;
   lineRenderer.SetColors(renderer.material.color,renderer.material.color);
   lineRenderer.SetVertexCount(360.0/stride+1);
   indexCounter = 0;

   r = transform.rotation;
   for (i=0.0; i<=360.0; i+=stride)
   {
      r *= Quaternion.Euler(0, stride, 0);
      lineRenderer.SetPosition(indexCounter, transform.position + (r*Vector3(0,0,1)*range));
      indexCounter += 1;
   }
}





/*
// LIGHTNING BOLT EFFECT
var target : GameObject;
var LR : LineRenderer;
var arcLength = 2.0;
var arcVariation = 2.0;
var inaccuracy = 1.0;

function Update()
{

   var lastPoint = transform.position;
   var i = 1;
   LR.SetPosition(0, transform.position);//make the origin of the LR the same as the transform
   while (Vector3.Distance(target.transform.position, lastPoint) >.5)
   {
      //was the last arc not touching the target?
      LR.SetVertexCount(i + 1);//then we need a new vertex in our line renderer
      var fwd = target.transform.position - lastPoint;//gives the direction to our target from the end of the last arc
      fwd.Normalize();//makes the direction to scale
      fwd = Randomize(fwd, inaccuracy);//we don't want a straight line to the target though
      fwd *= Random.Range(arcLength * arcVariation, arcLength);//nature is never too uniform
      fwd += lastPoint;//point + distance * direction = new point. this is where our new arc ends
      LR.SetPosition(i, fwd);//this tells the line renderer where to draw to
      i++;
      lastPoint = fwd;//so we know where we are starting from for the next arc
   }

}

function Randomize (v3 : Vector3, inaccuracy2 : float)
{
   v3 += Vector3(Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0)) * inaccuracy2;
   v3.Normalize();
   return v3;
}
*/