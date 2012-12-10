var target : Transform;
var targetLocation : Vector3;
var speed : float;
var useAcceleration : boolean;
var acceleration : float;
//var turnSpeed : float;
var followTerrain : boolean;
var followTerrainHeight : float = 0.0;
var reachTargetDistance : float = 1.0;
var reachTargetReceiver : Transform;
var reachTargetFunction : String;
var destroyDelay : float = 0.0;

private var currentSpeed : float;
private var fired : boolean = false;



function Awake()
{
   currentSpeed = (useAcceleration) ? 0.0 : speed;
}

function Update()
{
   if (fired)
   {
      if (target)
         targetLocation = target.position;

      if (useAcceleration)
      {
         if (currentSpeed < speed)
         {
            currentSpeed += Time.deltaTime * acceleration;
            if (currentSpeed > speed)
               currentSpeed = speed;
         }
      }

      transform.LookAt(targetLocation);
      transform.Translate(Vector3.forward * Time.deltaTime * currentSpeed);

      if (followTerrain)
      {
         var mask : int = 1 << 10; // terrain
         var theRay : Vector3 = Vector3.down;
         var rcHit : RaycastHit;
         var rayStart : Vector3 = transform.position;
         rayStart.y += 500;

         // Align this new position with the terrain
         if (Physics.Raycast(rayStart, theRay, rcHit, 1000, mask))
         {
            //transform.rotation = Quaternion.FromToRotation(Vector3.up, rcHit.normal) * Quaternion.LookRotation(Vector3.forward);
            transform.position = rcHit.point + (Vector3.up*followTerrainHeight);
         }
      }


      var vecToTarget : Vector3 = (transform.position - targetLocation);

      // Remove y component, since we're ground clamped
      if (followTerrain)
         vecToTarget.y = 0.0;

      if (vecToTarget.magnitude < reachTargetDistance)
         TargetReached();

      //var rotation = Quaternion.LookRotation(target.position - transform.position);
      //transform.rotation = Quaternion.Slerp(transform.rotation, rotation, Time.deltaTime * turnSpeed);
   }
}

function TargetReached()
{
   fired = false;
   if (reachTargetReceiver)
      reachTargetReceiver.SendMessage(reachTargetFunction, SendMessageOptions.DontRequireReceiver);
   Destroy(gameObject, destroyDelay);
   transform.position.y = -100000.0;
}

function Fire()
{
   fired = true;
}