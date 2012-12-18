#pragma strict

var arcHeight : float;
var timeToImpact : float;
var color : Color;
var completeTarget : Transform;
var destroyOnImpact : boolean;
var particle : ParticleSystem;
var trail : TrailRenderer;
var explosion : Transform;

private var targetPos : Vector3;
private var startTime : float;
private var endTime : float;
private var startPos : Vector3;
private var fired : boolean;

function Update()
{
   if (fired)
   {
      var cTime : float = Mathf.InverseLerp(startTime, endTime, Time.time);
      var currentPos : Vector3  = Vector3.Lerp(startPos, targetPos, cTime);
      currentPos.y += arcHeight * Mathf.Sin(Mathf.Clamp01(cTime) * Mathf.PI);
      transform.position = currentPos;

      // Reached destination
      if (Time.time >= endTime)
      {
         // Stop the update loop
         fired = false;

         // Explosion
         if (explosion)
         {
            var expl : Transform = Instantiate(explosion, transform.position, Quaternion.identity);
            if (expl)
            {
               var explosionParticle = expl.GetComponent(ParticleSystem);
               if (explosionParticle)
                  explosionParticle.startColor = color;

               var explosionProjector = expl.FindChild("Projector").GetComponent(Projector);
               if (explosionProjector)
               {
                  var newMat : Material = new Material(explosionProjector.material);
                  var c : Color = color;
                  c.a = 0;
                  newMat.SetColor("_TintColor", c);
                  explosionProjector.material = newMat;
               }
            }
         }

         // Send complete
         if (completeTarget)
            completeTarget.SendMessage("OnProjectileImpact", SendMessageOptions.DontRequireReceiver);

         // Destroy
         if (destroyOnImpact)
            Destroy(gameObject);
      }
   }
}

function FireAt(position : Vector3)
{
   startTime = Time.time;
   endTime = startTime + timeToImpact;
   startPos = transform.position;
   targetPos = position;
   fired = true;
}

function SetColor(newColor : Color)
{
   color = newColor;

   if (renderer && renderer.material)
   {
      renderer.material.color = newColor;
      renderer.material.SetColor("_TintColor", newColor);
   }

   if (particle)
      particle.startColor = newColor;

   if (trail)
      trail.renderer.material.color = newColor;
}