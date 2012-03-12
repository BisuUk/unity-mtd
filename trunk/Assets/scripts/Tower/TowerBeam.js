#pragma strict

var target : GameObject;

// Find the the closest unit
function FindClosestUnit () : GameObject
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

function Update()
{
   var closest : GameObject = FindClosestUnit();
   if (closest)
   {
      transform.LookAt(closest.transform);
      target = closest;
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