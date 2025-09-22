#include <array>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <random>

namespace {

struct Box {
    std::array<double, 3> min{};
    std::array<double, 3> max{};
};

Box make_box(std::mt19937& rng) {
    std::uniform_real_distribution<double> dist(-2.0, 2.0);
    std::array<double, 3> a{dist(rng), dist(rng), dist(rng)};
    std::array<double, 3> b{dist(rng), dist(rng), dist(rng)};

    Box box;
    for (int i = 0; i < 3; ++i) {
        box.min[i] = std::min(a[i], b[i]);
        box.max[i] = std::max(a[i], b[i]);
        if (box.max[i] - box.min[i] < 1e-6) {
            box.max[i] = box.min[i] + 1e-6; // avoid zero-size edges
        }
    }
    return box;
}

double volume(const Box& box) {
    return (box.max[0] - box.min[0]) * (box.max[1] - box.min[1]) * (box.max[2] - box.min[2]);
}

Box bounding_union(const Box& a, const Box& b) {
    Box result;
    for (int i = 0; i < 3; ++i) {
        result.min[i] = std::min(a.min[i], b.min[i]);
        result.max[i] = std::max(a.max[i], b.max[i]);
    }
    return result;
}

Box intersection(const Box& a, const Box& b) {
    Box result;
    for (int i = 0; i < 3; ++i) {
        result.min[i] = std::max(a.min[i], b.min[i]);
        result.max[i] = std::min(a.max[i], b.max[i]);
    }
    return result;
}

double intersection_volume(const Box& a, const Box& b) {
    const Box inter = intersection(a, b);
    for (int i = 0; i < 3; ++i) {
        if (inter.max[i] <= inter.min[i]) {
            return 0.0;
        }
    }
    return volume(inter);
}

double union_volume(const Box& a, const Box& b) {
    return volume(a) + volume(b) - intersection_volume(a, b);
}

double difference_volume(const Box& a, const Box& b) {
    const double overlap = intersection_volume(a, b);
    const double diff = volume(a) - overlap;
    return diff < 0.0 ? 0.0 : diff;
}

void ensure(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "Boolean fuzz failure: " << message << '\n';
        std::abort();
    }
}

void run_boolean_fuzz() {
    std::mt19937 rng(1337u);
    std::uniform_int_distribution<int> opDist(0, 2);

    constexpr int iterations = 500;
    for (int i = 0; i < iterations; ++i) {
        const Box boxA = make_box(rng);
        const Box boxB = make_box(rng);
        const double volA = volume(boxA);
        const double volB = volume(boxB);
        const double overlap = intersection_volume(boxA, boxB);
        const double combined = union_volume(boxA, boxB);
        const double remainder = difference_volume(boxA, boxB);

        ensure(volA > 0.0 && volB > 0.0, "degenerate box volume");
        ensure(overlap >= 0.0, "overlap negative");
        ensure(combined + 1e-9 >= std::max(volA, volB), "union volume too small");
        ensure(combined <= volume(bounding_union(boxA, boxB)) + 1e-9,
               "union volume exceeded bounding box volume");
        ensure(remainder + overlap <= volA + 1e-9, "difference + overlap should not exceed original");

        // spot-check random operation invariants
        switch (opDist(rng)) {
            case 0: { // associativity approximation for union
                const Box boxC = make_box(rng);
                const double uvAB = union_volume(boxA, boxB);
                const double uvBC = union_volume(boxB, boxC);
                ensure(union_volume(boxA, bounding_union(boxB, boxC)) + 1e-6 >= uvAB,
                       "union associativity lower bound");
                ensure(union_volume(bounding_union(boxA, boxB), boxC) + 1e-6 >= uvBC,
                       "union associativity upper bound");
                break;
            }
            case 1: { // intersection symmetry
                ensure(std::abs(intersection_volume(boxA, boxB) - intersection_volume(boxB, boxA)) < 1e-9,
                       "intersection symmetry broken");
                break;
            }
            case 2: { // difference boundedness
                ensure(difference_volume(boxA, boxB) + difference_volume(boxB, boxA) <=
                           volume(bounding_union(boxA, boxB)) + 1e-6,
                       "difference volumes exceed bounding union");
                break;
            }
        }
    }
}

} // namespace

int main() {
    run_boolean_fuzz();
    return 0;
}
