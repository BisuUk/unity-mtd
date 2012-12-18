#pragma strict

var action : TouchActionsType;
var color : Color;
var magnitude : float;
var destroyOnImpact : boolean;

function LateUpdate()
{
   // Jostle just a tiny bit so OnTriggerEnter fires
   // iTween doesn't trigger this automatically for some reason.
   transform.position.x += 0.001;
}

function SetColor(newColor : Color)
{
   color = newColor;
}

function OnTriggerEnter(other : Collider)
{
   var monster : Monster = other.GetComponent(Monster);
   if (monster)
   {
      switch (action)
      {
         case TouchActionsType.TOUCH_DAMAGE:
            //if (!Network.isClient)
            //   unit.Kill();
            break;

         case TouchActionsType.TOUCH_COLOR_CHANGE:
            //var newColor : Color = Color.Lerp(monster.color, color, magnitude);
            var newColor : Color;
            if (color.r > monster.color.r)
               newColor.r = Mathf.Clamp01(monster.color.r + magnitude);
            else if (color.r < monster.color.r)
               newColor.r = Mathf.Clamp01(monster.color.r - magnitude);
            else
               newColor.r = monster.color.r;

            if (color.g > monster.color.g)
               newColor.g = Mathf.Clamp01(monster.color.g + magnitude);
            else if (color.g < monster.color.g)
               newColor.g = Mathf.Clamp01(monster.color.g - magnitude);
            else
               newColor.g = monster.color.g;

            if (color.b > monster.color.b)
               newColor.b = Mathf.Clamp01(monster.color.b + magnitude);
            else if (color.b < monster.color.b)
               newColor.b = Mathf.Clamp01(monster.color.b - magnitude);
            else
               newColor.b = monster.color.b;

            monster.SetColor(newColor);
            break;
      }

      if (destroyOnImpact)
         Destroy(gameObject);
   }
}