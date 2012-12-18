#pragma strict

var timeToImpact : float;
var arcHeight : float;
var projectile : GameObject;
var particle : ParticleSystem;
var destroyManually : boolean;
var completeTarget : Transform;
var explosionPrefab : Transform;
var targetPos : Vector3;
var color : Color;
var ignoresTimeScale : boolean;

// Returns true if 'end' can be reached at the given 'speed', otherwise
// it returns false.
function CalculateTrajectory(
   start : Vector3,
   end : Vector3,
   speed : float,
   bUseHighArc : boolean) : Vector3
{
    var canHit : boolean  = false;

    // We use doubles instead of floats because we need a lot of
    // precision for some uses of the pow() function coming up.
    var term1 : double  = 0.0f;
    var term2 : double = 0.0f;
    var root : double  = 0.0f;

    var diffVector : Vector3 = end - start;

    // A horizontally-flattened difference vector.
    var horz : Vector3  = Vector3(diffVector.x, 0.0f, diffVector.z);

    // We shrink our values by this factor to prevent too much
    // precision loss.
    var factor : float  = 100.0;
 
    // Remember that Unitize returns length
    var x : float = horz.magnitude / factor;
    var y : float = diffVector.y / factor;
    var v : float = speed / factor;
    var g : float = 9.81 / factor;
 
    term1 = Mathf.Pow(v, 4) - (g * ((g * Mathf.Pow(x,2)) + (2 * y * Mathf.Pow(v,2))));
 
    // If term1 is positive, then the 'end' point can be reached
    // at the given 'speed'.
    if ( term1 >= 0 )
    {
        canHit = true;
 
        term2 = Mathf.Sqrt(term1);

        var divisor : double = (g * x);
 
        if ( divisor != 0.0f )
        {
            if ( bUseHighArc )
            {
                root = ( Mathf.Pow(v,2) + term2 ) / divisor;
            }
            else
            {
                root = ( Mathf.Pow(v,2) - term2 ) / divisor;
            }
 
            root = Mathf.Atan(root);
 
            var angleOut : float = root;

            var rightVector : Vector3 = Vector3.Cross(horz, Vector3.up);
 
            // Rotate the 'horz' vector around 'rightVector' 
            // by '-angleOut' degrees.
            //RotatePointAroundAxis(rightVector, -angleOut, horz);
            horz = Quaternion.AngleAxis(-angleOut, rightVector) * horz;
        }
 
        // Now apply the speed to the direction, giving a velocity
        return (horz * speed);
    }
 
    //return canHit;
    return Vector3.zero;
}


function SetColor(newColor : Color)
{
   //color = newColor + (Color.white*0.5);
   color = newColor;

   projectile.renderer.material.color = newColor;
   projectile.renderer.material.SetColor("_TintColor", newColor);

   if (particle)
      particle.startColor = newColor;

   var trail : TrailRenderer = projectile.GetComponent(TrailRenderer);
   if (trail)
      trail.renderer.material.color = newColor;
}