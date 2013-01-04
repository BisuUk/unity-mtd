using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class DecalDestroyer : MonoBehaviour
{
    private float _timeToDestroy;//time to sestroy
    public float TimeToDestroy
    {
        get { return _timeToDestroy; }
        set { _timeToDestroy = value; }
    }
    private float _fadingTime;
    public float FadingTime
    {
        get { return _fadingTime; }
        set { _fadingTime = value; }
    }
    private float _startFadingTime;
    private bool _fade = true;
    public bool Fade
    {
        get { return _fade; }
        set { _fade = value; }
    }


    [System.Reflection.ObfuscationAttribute]
    private void Start()
    {
        StartCoroutine(TimingDestroy());
    }
    /// Delay
    private IEnumerator TimingDestroy()
    {
        yield return new WaitForSeconds(_timeToDestroy);
        if (_fade)
        {
            _startFadingTime = Time.time;
            StartCoroutine(SmoothFade());
        }
        else
        {
            ClearAndDestroy();
        }
    }
    /// Smooth destroy , alpha
    private IEnumerator SmoothFade()
    {
        float i = 1;
        while (i > 0)
        {
            float delta = Time.time - _startFadingTime;
            i = (_fadingTime - delta) / _fadingTime;

            Color color = renderer.material.color;
            color.a = i;
            renderer.material.color = color;

            yield return null;
        }
        ClearAndDestroy();
    }
    /// Clearing
    private void ClearAndDestroy()
    {
        Destroy(GetComponent<MeshFilter>().sharedMesh);
        Destroy(renderer.material);
        Destroy(this.gameObject);
    }
}
