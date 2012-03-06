#pragma strict

var pathToFollow : Transform;
var sides : int;
var color : Color;
var size  : float;
var count : int;
var path  : List.<Vector3>;
var pathCaptureDist : float;
var speed : float;
static var baseScale : Vector3 = Vector3(0.25, 0.25, 0.25);

class UnitSquad
{
   var sides : int;
   var color : Color;
   var size  : float;
   var count : int;
   var id : int;
   var deployed : boolean;
};

function Start()
{
}

function Update()
{
   if (path.Count > 0)
   {
      var p : Vector3 = path[0];
      transform.LookAt(p);
      transform.Translate(transform.forward * speed * Time.deltaTime, Space.World);

      var dist : float = Vector3.Distance(transform.position, p);
      if (dist < pathCaptureDist)
         path.RemoveAt(0);
   }
   else
   {
      Destroy(this);
   }
}

function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);
}

function SetAttributes(squad : UnitSquad)
{
   SetAttributes(squad.sides, squad.size, squad.color);
}

function SetAttributes(pSides : int, pSize : float, pColor : Color)
{
   sides = pSides;
   size = pSize;
   color = pColor;

   var scale : Vector3 = Vector3(baseScale.x + pSize, baseScale.y + pSize,  baseScale.z + pSize);
   transform.localScale = scale;
   renderer.material.color = pColor;
}